// Copyright 2017 Google Inc.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
// limitations under the License.

import { Scene, GridSize } from '../core/scene';
import { CommonTex } from '../core/common-tex';
import { C4DUtils } from '../c4d/c4d-utils';
import { C4DExportLoader } from '../c4d/c4d-export-loader';
import { JPEGWorker } from '../workers/jpeg-worker';
import { MathUtils } from '../utils/math-utils';

const TerrainShader = require( '../shaders/terrain-shader' );
const EdgeShader = require( '../shaders/edge-shader' );

const EDGE_VECTORS = [
	new THREE.Vector3( 1, 0, 0 ),
	new THREE.Vector3( 0, 1, 0 ),
	new THREE.Vector3( 0, 0, 1 )
];

const ZERO_VECTOR = new THREE.Vector3( 0, 0, 0 );

// Named texture sizes and their corresponding filename suffixes
const TEXTURE_SIZES = [ 'small', 'base', 'large' ];
const TEXTURE_SUFFIXES = {
	xsmall: '_xsm',
	small: '_sm',
	base: '',
	large: '_lg'
};

// On mobile platforms, only the four center tiles are allowed to load the medium
// resolution texture, in order to save memory. The four center tile IDs are
// specified here.
const CENTER_TILE_IDS = [ '03333333', '12222222', '21111111', '30000000' ];

const TERRAIN_DIR = 'terrain/';
const LOAD_PROXY_GEO = new THREE.PlaneBufferGeometry( 0.01, 0.01 );
const ANIM_IN_DURATION = 1.0;

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'terrain', {

		dependencies: [ 'visible' ],

		init: function() {

			this.tileMeshes = [];
			this.tileMeshesByID = {};

			this.background = null;
			this.collision = null;

			this.animIn = 0;
			this.gridState = 1;
			this.isSimpleVisible = false;
			this.isTerrainVisible = false;

			this.el.sceneEl.addEventListener( 'terrain-intersected', this.onIntersected.bind( this ) );
			this.el.sceneEl.addEventListener( 'terrain-intersected-cleared', this.onControllerMoved.bind( this ) );
			document.addEventListener( 'mousemove', this.onMouseMoved.bind( this ) );

			this.el.setAttribute( 'event-priority', 50 );

			// Listen for stateremoved event for showing the collision or terrain meshes
			this.el.addEventListener( 'stateadded', event => {

				if ( event.detail.state === 'show-simple' ) {
					this.isSimpleVisible = true;
					if ( this.collision ) this.collision.setVisible( this.isSimpleVisible );
				}

				if ( event.detail.state === 'show-terrain' ) {
					this.isTerrainVisible = true;
					this.setVisible( this.isTerrainVisible );
				}

			});

			// Listen for stateremoved event for hiding the collision or terrain meshes
			this.el.addEventListener( 'stateremoved', event => {

				if ( event.detail.state === 'show-simple' ) {
					this.isSimpleVisible = false;
					if ( this.collision ) this.collision.setVisible( this.isSimpleVisible );
				}

				if ( event.detail.state === 'show-terrain' ) {
					this.isTerrainVisible = false;
					this.setVisible( this.isTerrainVisible );
				}

			});
		},

		/**
		 * Loads everything required to render the terrain:
		 * common textures, scene file, and initial detail textures.
		 * Returns a promise which resolves when the loading is complete.
		 */
		loadTerrain: function() {
			return new Promise( ( resolve, reject ) => {
				CommonTex.load()
				.then( () => this.loadMeshes() )
				.then( () => this.loadInitialTextures() )
				.then( () => resolve( this.tileMeshes ) );
			});
		},

		/**
		 * Loads the terrain mesh for the current site.
		 * Returns a promise which resolves when the terrain meshes are loaded
		 */
		loadMeshes: function() {

			const rootPath = TERRAIN_DIR + Scene.baseFilename + '/' + Scene.baseFilename;
			const loader = new C4DExportLoader();

			return new Promise( ( resolve, reject ) => {

				loader.load( TERRAIN_DIR + Scene.baseFilename + '/terrain.glb' ).then( response => {

					this.terrain = response.scene;
					this.terrain.scale.multiplyScalar( 100 );
					this.el.setObject3D( 'mesh', this.terrain );

					// Loop through each node in the scene and separate out the tiles
					// from the background and collision meshes.
					this.terrain.traverse( node => {
						if ( !node.metadata ) return;

						if ( node.metadata.type === 'SIMPLE' ) {
							this.collision = new SimpleTerrain( node );
							this.collision.setVisible( this.isSimpleVisible );
							return;
						}

						if ( node.metadata.type === 'BACKGROUND' ) {
							this.background = new BackgroundTerrain( node );
							this.background.setVisible( this.isTerrainVisible );
							return;
						}

						if ( node.metadata.type === 'TILE' ) {
							var mesh = new TileMesh( node );
							this.tileMeshes.push( mesh );
							this.tileMeshesByID[ mesh.id ] = mesh;
						}
					});

					// Set up the simplified collision mesh
					this.el.appendChild( this.collision.el );
					this.collision.setupMesh();
					this.collision.bindEvents();

					// Load the background terrain's texture, then resolve the promise
					this.background.loadTexture().then( () => resolve() );
				});
			});
		},

		/**
		 * Loads each tile's initial textures.
		 * Returns a promise which resolves when all initial textures are loaded
		 */
		loadInitialTextures: function() {

			return new Promise( ( resolve, reject ) => {

				if ( !this.tileMeshes.length ) return reject();

				// Get array of promises for loading the initial set of textures
				const initialLoadPromises = this.tileMeshes.map( tilemesh => {
					return tilemesh.loadNextTextureSize();
				});

				// Execuse all promises and resolve when complete
				Promise.all( initialLoadPromises ).then( () => {
					resolve();
				});
			});
		},

		/**
		 * Update the transition animation state
		 */
		tick: function( t, dt ) {

			// Adjust delta time so that it is 0..1 over ANIM_IN_DURATION seconds
			dt = ( dt / 1000 ) * ( 1 / ANIM_IN_DURATION );

			// Roll the transition animation forward to 1 if the scene is visible and loaded,
			// otherwise roll it back to 0.
			if ( this.el.is( 'visible' ) && this.isTerrainVisible && this.el.sceneEl.is( 'intro-complete' ) ) {
				this.animIn += dt;
			} else {
				this.animIn -= dt;
			}

			this.animIn = MathUtils.clamp( this.animIn, 0, 1 );

			// Update all tile meshes with new the animIn value
			this.tileMeshes.forEach( mesh => {
				mesh.updateMaterialAnimIn( this.animIn );
			});
		},

		onIntersected: function( event ) {
			this.gridState = this.el.sceneEl.is( 'interactive' ) ? 2 : 0;
			this.updateGrid( event.detail.point );
		},

		onMouseMoved: function() {
			this.gridState--;
			this.updateGrid( ZERO_VECTOR );
		},

		onControllerMoved: function() {
			this.gridState = 0;
			this.updateGrid( ZERO_VECTOR );
		},

		/**
		 * Update the grid overlay's position to match the cursor ray
		 * position. Some extra math is required to compensate for
		 * the variable size of the grid overlay.
		 *
		 * TODO: this could be optimized. Instead of every tile calculating the
		 * scaled grid position, it should only be done once.
		 */
		updateGrid( point ) {
			const gridPosition = point.clone()
				.subScalar( GridSize / 2 )
				.multiplyScalar( 1 / GridSize );

			this.tileMeshes.forEach( mesh => {
				mesh.updateMaterialGrid( gridPosition, this.gridState );
			});
		},

		setVisible: function( visible ) {
			this.background.setVisible( visible );
		},

		loadNextTextureSizeForID: function( id ) {
			return this.tileMeshesByID[ id ].loadNextTextureSize();
		},

		remove: function() {
			this.tileMeshes.forEach( mesh => mesh.destroy() );
			this.collision.destroy();
			this.background.destroy();

			this.tileMeshes = [];
			this.tileMeshesByID = {};

			this.el.removeObject3D( 'mesh' );
		}
	});
}

/**
 * TileMesh
 *
 * Class which contains a single terrain tile mesh, and handles loading and
 * initialization of its multi-size textures.
 */
class TileMesh {

	constructor( node ) {
		this.node = node;
		this.id = this.node.metadata.id;
		this.mesh = C4DUtils.getChildWithType( node, 'Mesh' );
		this.animIn = 0;

		// Remove unused color geometry attribute
		this.mesh.geometry.removeAttribute( 'color' );

		// Get the center coordinate of the tile by calculating the tile's bounding box.
		// The center coordinate is used to sort tiles by distance from the player so that
		// closer tiles load their higher-resolution textures first.
		this.box = new THREE.Box3();
		this.box.setFromObject( this.mesh );
		this.center = this.box.getCenter();

		this.textureLoader = new THREE.TextureLoader();
		this.texturesBySize = {};
		this.textureSizePrefixes = [];
		this.currentTexture = undefined;
		this.currentSize = undefined;

		const isMobile = AFRAME.utils.device.isMobile();
		const isCenterTile = CENTER_TILE_IDS.indexOf( this.id ) !== -1;

		this.hasMediumSize = this.node.metadata.hasMediumSize;

		// On mobile platforms, do not load the large size textures
		this.hasLargeSize = this.node.metadata.hasLargeSize && !isMobile;

		// On mobile platforms, only the four center tiles are allowed to load the medium
		// resolution texture, in order to save memory.
		if ( isMobile && !isCenterTile ) {
			this.hasMediumSize = false;
		}

		// Adjust texture size prefixes depending on what platform the user is on.
		//
		// Mobile platforms load only the xsmall and medium sizes.
		// Desktop platforms load the xsmall, then medium, then large sizes.
		if ( isMobile ) {
			this.textureSizePrefixes = [
				this.node.metadata.xsmallPrefix,
				TEXTURE_SUFFIXES.base
			];
		} else {
			this.textureSizePrefixes = [
				this.node.metadata.xsmallPrefix,
				TEXTURE_SUFFIXES.base,
				TEXTURE_SUFFIXES.large
			];
		}

		// The small texture size is a normal THREE.Texture object. It is displayed
		// normally and is the first texture the user will see when the terrain is
		// visible. Until this texture is loaded, the terrain will not be displayed
		// and a loading bar will be displayed to the user.
		this.texturesBySize.small = new THREE.Texture();

		// The base size texture is a special ProgressiveTexture object which uses a
		// progressive loading technique to load JPEG data onto the GPU without causing
		// framerate stutters.
		//
		// This allows us to load the small texture size initially before the user sees anything,
		// and then as the user explores the environment, these higher resolution images will be
		// loaded in the background without disrupting the overall experience.
		//
		// This gives us a fast initial load, but also allows for the gradual loading of higher
		// resolution textures without interruption.
		if ( this.hasMediumSize ) {
			this.texturesBySize.base = new THREE.ProgressiveTexture( this.node.metadata.size );
		}

		// Some tiles have a large size texture, which is 2x the base texture size. This texture
		// is also progressively loaded.
		if ( this.hasLargeSize && !isMobile ) {
			this.texturesBySize.large = new THREE.ProgressiveTexture( this.node.metadata.size * 2 );
		}

		// Create a load proxy material. Because of the way the ProgressiveTexture loads
		// images, it will display garbage data until the loading is complete. We don't
		// want to show this garbage data, so the ProgressiveTexture is loaded into this
		// proxy material onto the proxy mesh, which is a small plane placed out of view.
		// Once the load is complete, the texture will be swapped onto the main tile mesh.
		//
		// The proxy material is set to use the base size texture, since that is the first
		// size which will be loaded using the progressive loader.
		if ( this.hasMediumSize ) {
	 		this.loadProxyMaterial = new THREE.MeshBasicMaterial();
			this.loadProxyMaterial.map = this.texturesBySize.base;
			this.loadProxyMesh = new THREE.Mesh( LOAD_PROXY_GEO, this.loadProxyMaterial );

			// Prevent the proxy mesh from being culled. Because the transfer of texture data
			// from the progressive JPEG loader to the GPU is done in the render thread, if
			// the proxy mesh is culled from the render queue, it will not update and
			// the progressive loading will stall.
			this.loadProxyMesh.frustumCulled = false;
			this.node.add( this.loadProxyMesh );
		}

		// Create a standard terrain tile material. The texture map stored in loadProxyMaterial
		// will be swapped into this material once the progressive loading is complete.
		this.mesh.material = new THREE.ShaderMaterial({
			uniforms: THREE.UniformsUtils.clone( TerrainShader.uniforms ),
			vertexShader: TerrainShader.vertexShader,
			fragmentShader: TerrainShader.fragmentShader
		});

		// Enable wireframe mode if the scene flag is set
		this.mesh.material.wireframe = Scene.wireframe;

		// Set initial shader uniforms
		this.mesh.material.uniforms.gridTex.value = CommonTex.textures.grid;
		this.mesh.material.uniforms.triangleTex.value = CommonTex.textures.triangles;
	}

	/**
	 * Loads the next texture size up in the texture size list.
	 * Starts at size 0 if currentSize is undefined.
	 *
	 * Returns a promise which resolves when the texture is loaded.
	 */
	loadNextTextureSize() {

		return new Promise( ( resolve, reject ) => {

			// Set initial size to load or increment the current size
			if ( this.currentSize === undefined ) {
				this.currentSize = 0;
			} else {
				this.currentSize++;
			}

			// Requested a texture, but it doesn't exist; exit
			if ( this.currentSize > 2 ) return resolve( 'maximum size reached' );
			if ( this.currentSize === 1 && !this.hasMediumSize ) return resolve( 'medium size doesn\'t exist' );
			if ( this.currentSize === 2 && !this.hasLargeSize ) return resolve( 'large size doesn\'t exist' );

			// Get the previous texture so it can be disposed of properly once the current
			// texture is loaded.
			if ( this.currentSize > 0 ) {
				this.previousTexture = this.texturesBySize[ TEXTURE_SIZES[ this.currentSize - 1 ] ];
			} else {
				this.previousTexture = null;
			}

			// Grab the current texture object from the size list
			this.currentTexture = this.texturesBySize[ TEXTURE_SIZES[ this.currentSize ] ];

			const url = Scene.rootDirectory + 'tiles/' + this.id + this.textureSizePrefixes[ this.currentSize ] + '.jpg';

			// Only ProgressiveTextures need to be loaded with the JPEG worker.
			// Normal textures can be loaded with the standard TextureLoader.
			if ( this.currentTexture.isProgressiveTexture ) {

				// Texture doesn't exist, exit
				if ( !this.currentTexture ) return resolve( 'size doesn\'t exist' );

				// Texture is already loaded, exit
				if ( this.currentTexture.displayed ) return resolve( 'texture is already loaded' );

				// Set texture URL
				this.currentTexture.url = url;

				// Set jpeg worker host to the current texture
				JPEGWorker.host = this.currentTexture;

				// Release the jpeg worker host and update the material when
				// the current texture is displayed
				this.currentTexture.onDisplayComplete( () => {
					JPEGWorker.host = null;
					this.updateMaterialTexture();
					this.destroyPreviousTexture();
					return resolve( 'success: size = ' + TEXTURE_SIZES[ this.currentSize ] );
				});

				// Load using the static jpeg worker
				this.currentTexture.loadWithWorker( JPEGWorker.worker );
				this.loadProxyMaterial.map = this.currentTexture;
				this.loadProxyMaterial.needsUpdate = true;

			} else {

				// Texture is already loaded, exit
				if ( this.currentTexture.image ) return resolve( 'texture is already loaded' );

				// Load using the normal texture loader
				this.textureLoader.load( url, texture => {
					this.currentTexture = texture;
					this.updateMaterialTexture();
					this.destroyPreviousTexture();
					return resolve( 'success: size = ' + TEXTURE_SIZES[ this.currentSize ] );
				});

			}
		});
	}

	/**
	 * Updates the animIn value to a given number
	 */
	updateMaterialAnimIn( animIn ) {
		if ( !this.mesh ) return;
		if ( this.mesh.material.uniforms.animIn.value === animIn ) return;
		this.mesh.material.uniforms.animIn.value = animIn;
	}

	/**
	 * Updates the terrain texture map to the current texture
	 */
	updateMaterialTexture() {
		if ( !this.mesh ) return;
		this.mesh.material.uniforms.terrainTex.value = this.currentTexture;
		this.mesh.material.needsUpdate = true;
	}

	/**
	 * Updates the grid overlay's position and opacity state
	 */
	updateMaterialGrid( position, gridState ) {
		if ( !this.mesh ) return;
		this.mesh.material.uniforms.gridOpacity.value = gridState > 0 ? 1 : 0;
		this.mesh.material.uniforms.gridPosition.value = position.clone();
	}

	/**
	 * Dispose of the previously-loaded texture
	 */
	destroyPreviousTexture() {
		if ( !this.previousTexture ) return;
		this.previousTexture.dispose();
		this.previousTexture = null;
		this.loadProxyMaterial.map = null;
		this.texturesBySize[ TEXTURE_SIZES[ this.currentSize - 1 ] ] = null;
	}

	/**
	 * Attempts to dispose of (almost) every piece of memory this object references
	 */
	destroy() {
		if ( this.mesh ) {
			this.mesh.material.uniforms.terrainTex.value = null;
			this.mesh.material.dispose();
			this.mesh.geometry.dispose();
			this.mesh.geometry = null;
		}

		if ( this.loadProxyMaterial ) this.loadProxyMaterial.dispose();
		if ( this.texturesBySize.base ) this.texturesBySize.base.dispose();
		if ( this.texturesBySize.small ) this.texturesBySize.small.dispose();
		if ( this.texturesBySize.large ) this.texturesBySize.large.dispose();
		if ( this.currentTexture ) this.currentTexture.dispose();
		if ( this.loadProxyMesh ) this.node.remove( this.loadProxyMesh );

		this.texturesBySize = null;
		this.loadProxyMaterial = null;
		this.currentTexture = null;
		this.loadProxyMaterial = null;
		this.loadProxyMesh = null;
		this.mesh = null;
		this.node = null;
	}
}


/**
 * BackgroundTerrain
 *
 * Class which contains the low-res unwalkable background terrain mesh and loader
 * for the background mesh's texture.
 */
class BackgroundTerrain {

	constructor( node ) {
		this.node = node;
		this.mesh = C4DUtils.getChildWithType( this.node, 'Mesh' );
		this.loader = new THREE.TextureLoader();
		this.visible = false;

		// Remove unused color geometry attribute
		this.mesh.geometry.removeAttribute( 'color' );
	}

	loadTexture() {

		return new Promise( ( resolve, reject ) => {

			const path = TERRAIN_DIR + Scene.baseFilename + '/background.jpg';

			this.loader.load( path, texture => {

				this.uniforms = THREE.UniformsUtils.clone( TerrainShader.uniforms );
				this.uniforms.terrainTex.value = texture;

				this.mesh.material = new THREE.ShaderMaterial({
					uniforms: this.uniforms,
					fragmentShader: TerrainShader.fragmentShader,
					vertexShader: TerrainShader.vertexShader,
					visible: this.visible
				});

				// Listen for initial-load-complete event from Scene, and show
				// the background terrain when it is thrown.
				Scene.on( 'initial-load-complete', event => {
					if ( !this.mesh ) return;
					this.mesh.material.uniforms.animIn.value = 1;
					this.mesh.material.needsUpdate = true;
				});

				resolve();
			});
		});
	}

	setVisible( visible ) {
		this.visible = visible;
		if ( this.mesh.material ) {
			this.mesh.material.visible = this.visible;
		}
	}

	destroy() {
		if ( this.mesh.material ) {
			this.mesh.material.uniforms.terrainTex.value = null;
			this.mesh.material.dispose();
		}

		this.mesh.geometry.dispose();
		this.mesh.geometry = null;

		this.mesh = null;
		this.node = null;
	}
}


/**
 * SimpleTerrain
 *
 * Class which contains the simplified terrain mesh, used for collision
 * detection and for displaying as a wireframe during scene loading.
 */
class SimpleTerrain {

	constructor( node ) {
		this.node = node;
		this.mesh = C4DUtils.getChildWithType( this.node, 'Mesh' );
		this.visible = false;

		this.el = document.createElement( 'a-entity' );
		this.el.classList.add( 'clickable' );
		this.el.classList.add( 'ignoreBounds' );
		this.el.setAttribute( 'consume-click', '' );
		this.el.setObject3D( 'mesh', this.mesh );
		this.el.id = 'collision';

		this.cursorPosition = new THREE.Vector3();
		this.cursorStart = new THREE.Vector3();
	}

	setupMesh() {
		var terrainGeometry = this.mesh.geometry;

		// Convert the terrain's BufferGeometry to regular Geometry and back again. This
		// forces mergeVertices() to be called, which removes all duplicate vertices which
		// are left over from the mesh simplification process.
		terrainGeometry = new THREE.Geometry().fromBufferGeometry( terrainGeometry );
		terrainGeometry = new THREE.BufferGeometry().fromGeometry( terrainGeometry );

		// Generate barycentric coordinates for each triangle vertex. This is used by the edge-shader
		// to generate a wireframe effect.
		//
		// Based on http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
		var position = terrainGeometry.attributes.position;
		var centers = new Float32Array( position.count * 3 );
		for ( let i = 0, l = position.count; i < l; i++ ) {
			EDGE_VECTORS[ i % 3 ].toArray( centers, i * 3 );
		}

		// Add the barycentric coordinate array to the terrain geometry as a vertex attribute
		terrainGeometry.addAttribute( 'center', new THREE.BufferAttribute( centers, 3 ) );

		// Remove unused geometry attributes
		terrainGeometry.removeAttribute( 'uv' );
		terrainGeometry.removeAttribute( 'color' );

		this.material = new THREE.ShaderMaterial({
			uniforms: EdgeShader.uniforms,
			vertexShader: EdgeShader.vertexShader,
			fragmentShader: EdgeShader.fragmentShader,
			visible: this.visible
		});

		// Set uniforms
		this.material.uniforms.lineColor.value = new THREE.Color( 0x9b9087 );
		this.material.uniforms.fillColor.value = new THREE.Color( 0x141312 );
		this.material.uniforms.fogColor.value = new THREE.Color( 0x141312 );
		this.material.extensions.derivatives = true;

		this.mesh = new THREE.Mesh( terrainGeometry, this.material );
		this.el.setObject3D( 'mesh', this.mesh );
	}

	setVisible( visible ) {
		this.visible = visible;
		if ( this.material ) {
			this.material.visible = this.visible;
		}
	}

	bindEvents() {
		this.el.addEventListener( 'raycaster-intersected', event => {
			if ( this.el.sceneEl.is( 'modal' ) ) return;

			this.cursorPosition.copy( event.detail.intersection.point );

			this.el.sceneEl.emit( 'terrain-intersected', event.detail.intersection, false );
		});

		this.el.addEventListener( 'raycaster-intersected-cleared', event => {
			this.el.sceneEl.emit( 'terrain-intersected-cleared', null, false );
		});

		this.el.addEventListener( 'raycaster-cursor-down', event => {
			if ( this.el.sceneEl.is( 'modal' ) ) return;

			this.cursorStart.copy( this.cursorPosition );

			this.el.sceneEl.emit( 'terrain-cursor-down', {
				point: this.cursorPosition
			}, false );
		});

		this.el.addEventListener( 'raycaster-cursor-up', event => {
			if ( this.el.sceneEl.is( 'modal' ) ) {
				this.el.sceneEl.emit( 'modal-up', null, false );
				return;
			}

			this.cursorStart.sub( this.cursorPosition );

			this.el.sceneEl.emit( 'terrain-cursor-up', {
				point: this.cursorPosition,
				buttonHoldTime: event.detail.buttonHoldTime,
				deltaSquared: this.cursorStart.lengthSq()
			}, false );
		});
	}

	destroy() {
		this.mesh.geometry.dispose();
		this.mesh.geometry = null;
		this.mesh = null;
		this.node = null;
	}
}
