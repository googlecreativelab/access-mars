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


/**
 * C4DSceneManager
 *
 * Class which loads and manages THREE.AnimationClip playback for an entire 
 * scene file exported using the COLLADA Export Plus plugin in Cinema4D.
 */

import { EventEmitter } from 'eventemitter3';
import { C4DUtils } from './c4d-utils';
import { C4DExportLoader } from './c4d-export-loader';

export class C4DSceneManager extends EventEmitter {

	constructor() {
		super();
		this.isPlaying = false;
		this.duration = 0;
	}

	/**
	 * Loads a given GLTF scene file exported from Cinema4D. 
	 * Animations and LinkObjects are set up and added to an 
	 * AnimationMixer for playback.
	 *
	 * Returns a promise which resolves when both the scene and 
	 * animation setups are complete.
	 */
	load( src, xrefPath, texPath ) {

		return new Promise( ( resolve, reject ) => {

			this.loader = new C4DExportLoader();
			this.loader.load( src, xrefPath, texPath ).then( response => {
				
				this.scene = response.scene;
				this.animClips = response.animations;
				this.linkObjects = response.linkObjects;
				this.hitboxes = response.hitboxes;
				this.highlights = {};

				this.initHitboxes();
				this.initAnimation();
				this.sortObjectsByType();
				
				resolve( response.scene );

			}).catch( error => reject( error ) );
		});
	}

	/**
	 * Match hitbox meshes to their corresponding rover-poi entities
	 */
	initHitboxes() {
		this.scene.traverse( node => {
			if ( !node.metadata ) return;
			if ( !node.metadata.highlight ) return;

			if ( !this.highlights.hasOwnProperty( node.metadata.highlight ) ) {
				this.highlights[ node.metadata.highlight ] = [];
			}

			this.highlights[ node.metadata.highlight ].push( node.metadata.mesh );
		});

		// Add hitboxes to their corresponding POI objects
		this.hitboxes.forEach( hitbox => {
			const marker = document.getElementById( 'rover_poi_' + hitbox.name );
			const target = marker.getAttribute( 'rover-poi' ).target;
			marker.emit( 'mesh-added', hitbox.node, false );
			marker.emit( 'materials-added', this.highlights[ target ], false );
		});
	}

	/**
	 * Creates and initializes animation playback for the loaded scene
	 */
	initAnimation() {
		// Create new AnimationMixer for clip playback
		this.animMixer = new THREE.AnimationMixer( this.scene );

		// Create AnimationClips for each C4DLinkObject.
		this.linkObjects.forEach( linkObject => {
			linkObject.setLinkTargetFromScene( this.scene );
			linkObject.setSourceClipFromClipArray( this.animClips );

			const linkedClip = linkObject.getLinkedAnimationClip();
			if ( linkedClip ) this.animClips.push( linkedClip );
		});

		// Get the duration of the entire animation, which is the duration of the longest clip
		this.animClips.forEach( clip => {
			this.duration = Math.max( this.duration, clip.duration );
		});

		// Create AnimationActions for each clip
		this.animActions = this.animClips.map( clip => {
			return this.animMixer.clipAction( clip );
		});

		// Configure AnimationAction playback properties
		this.animActions.forEach( action => {
			action.clampWhenFinished = true;
			action.loop = THREE.LoopOnce;
			action.play();
		});

		// Tick the mixer forward one frame, then reset immediately.
		// This ensures that the animation will pause at the first frame
		// until the play() function is called.
		this.animMixer.update( 1 / 60 );
		this.animMixer.stopAllAction();
	}

	/**
	 * Sorts all scene objects by metadata types. This is used only for
	 * the rover scene, so the type names are hardcoded.
	 */
	sortObjectsByType() {
		this.objectsByType = { LINES: [], PART: [], SKYCRANE: [], IMAGEPLANE: [] };

		this.scene.traverse( node => {
			if ( !node.metadata ) return;
			if ( !node.metadata.type ) return;
			this.objectsByType[ node.metadata.type ].push( node );
		});
	}

	/**
	 * Disables textures on all objects with type PART
	 */
	hidePartTextures() {
		this.objectsByType.PART.forEach( part => {
			const mesh = C4DUtils.getChildWithType( part, 'Mesh' );
			mesh.material.uniforms.color.value = new THREE.Color( 0 );
		});
	}

	/**
	 * Enables textures on all objects with the type PART
	 */
	showPartTextures() {
		this.objectsByType.PART.forEach( part => {
			const mesh = C4DUtils.getChildWithType( part, 'Mesh' );
			mesh.material.uniforms.color.value = new THREE.Color( 0xFFFFFF );
		});
	}

	/**
	 * Removes all objects of a given type from the scene
	 */
	removeObjectsWithType( type ) {
		this.objectsByType[ type ].forEach( obj => {
			const mesh = C4DUtils.getChildWithType( obj, 'Mesh' );
			obj.remove( mesh );
		});
	}

	/**
	 * Starts playback for all AnimationActions in the scene
	 */
	play() {
		this.animActions.forEach( action => action.play() );
		this.isPlaying = true;
	}

	/**
	 * Updates the master AnimationMixer timeline to the last frame.
	 */
	stopAtLastFrame() {
		this.animActions.forEach( action => action.play() );
		this.animMixer.update( this.duration );
		this.animMixer.stopAllAction();
	}

	/** 
	 * Updates the master AnimationMixer timeline with a given delta time
	 */
	tick( t, dt ) {
		if ( !this.isPlaying ) return;
		this.animMixer.update( dt );
	}
}
