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
 * controller-dot
 *
 * A dot which serves as the user's cursor pointer.
 * The dot is drawn by a shader on a small plane mesh.
 */

import { Scene } from '../core/scene';
import { PlatformUtils } from '../utils/platform-utils';

const ControllerDotShader = require( '../shaders/controller-dot-shader' );

const VECTOR_ONE = new THREE.Vector3( 1, 1, 1 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'controller-dot', {

		schema: {
			color: { type: 'color', default: '#FFF' },
			size: { type: 'number', default: 25 },
			scale: { type: 'number', default: 1 }
		},

		init: function() {
			this.scale = this.data.scale;

			this.cameraPosition = new THREE.Vector3();
			this.geometry = new THREE.PlaneBufferGeometry( 1, 1 );

			this.material = new THREE.ShaderMaterial({
				uniforms: ControllerDotShader.uniforms,
				fragmentShader: ControllerDotShader.fragmentShader,
				vertexShader: ControllerDotShader.vertexShader,
				depthTest: false,
				transparent: true
			});

			this.mesh = new THREE.Mesh( this.geometry, this.material );
			this.el.setObject3D( 'mesh', this.mesh );
			this.el.setAttribute( 'visible', false );

			this.el.object3D.scale.copy( VECTOR_ONE );
			this.el.object3D.scale.multiplyScalar( 0.0001 );

			this.onIntersectedRef = this.onIntersected.bind( this );

			this.tryAddingRaycaster();

			this.el.sceneEl.addEventListener( 'terrain-intersected', () => {
				this.el.setAttribute( 'visible', false );
			});

			this.el.sceneEl.addEventListener( 'terrain-intersected-cleared', () => {
				this.el.setAttribute( 'visible', true );
			});

			this.camera = document.getElementById( 'camera' );

			this.el.setAttribute( 'look-at-target', {
				axis: 'xyz',
				target: '#camera',
				alwaysUpdate: true,
				offset: new THREE.Vector3( 0, Math.PI, 0 )
			});

			Scene.on( 'on-controls-ready', this.tryAddingRaycaster.bind( this ) );
		},

		tryAddingRaycaster() {
			if ( this.raycaster ) {
				this.raycaster.removeEventListener( 'raycaster-intersection', this.onIntersectedRef );
			}

			if ( Scene.controllerType === 'mouse-touch' ) {
				this.raycaster = document.getElementById( 'mouse-touch-controller' );
			} else {
				this.raycaster = document.getElementById( 'right-hand' );
			}

			this.raycaster.addEventListener( 'raycaster-intersection', this.onIntersectedRef.bind( this ) );
		},

		onIntersected: function( event ) {
			if ( !this.el.getAttribute( 'visible' ) ) return;

			// Don't update the cursor on in desktop 360 mode. The mouse cursor will change
			// state when appropriate, which is the expected behavior during normal desktop browsing.
			if ( Scene.modeType === '360' && !AFRAME.utils.device.isMobile() ) return;

			const intersectionPoint = event.detail.intersections[ 0 ].point;
			this.camera.object3D.getWorldPosition( this.cameraPosition );

			// Move the reticle closer to camera to prevent intersections
			this.el.object3D.position.subVectors( this.cameraPosition, intersectionPoint );
			this.el.object3D.position.multiplyScalar( 0.05 ).add( intersectionPoint );

			// Calculate the distance between the dot and the camera
			const d = this.el.object3D.position.distanceTo( this.cameraPosition );

			// Minimize scaling based on distance from the camera.
			// A bit of scaling is OK, as it helps establish scale, but the dot
			// still needs to be large enough to be visible at all times.
			this.el.object3D.scale.copy( VECTOR_ONE );
			this.el.object3D.scale.multiplyScalar( d / this.data.size );
			this.el.object3D.scale.multiplyScalar( this.data.scale );
			this.el.object3D.scale.divideScalar( Math.min( d, 8 ) / 5 );
		},

		update: function() {
			this.material.uniforms.color.value = new THREE.Color( this.data.color );
			this.material.needsUpdate = true;
		}
	});
}
