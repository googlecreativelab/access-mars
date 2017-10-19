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
 * boundary-sphere
 *
 * An invisible sphere which encloses the entire scene.
 *
 * This is used to hit-test against instead of the skybox so
 * the user can see a cursor point if they're pointing at the sky.
 * Otherwise the cursor would disappear over the sky, which prevents
 * the user from being able to orient their hand controller easily.
 */

const VECTOR_ONE = new THREE.Vector3( 1, 1, 1 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'boundary-sphere', {

		init: function() {
			this.geometry = new THREE.SphereBufferGeometry( 0.5, 16, 16 );
			this.material = new THREE.MeshBasicMaterial({
				side: THREE.DoubleSide,
				visible: false
			});

			this.mesh = new THREE.Mesh( this.geometry, this.material );
			this.el.setObject3D( 'mesh', this.mesh );

			this.elWorldPosition = new THREE.Vector3();
			this.worldPosition = new THREE.Vector3();
			this.cameraPosition = new THREE.Vector3();
			this.camera = document.getElementById( 'camera' );

			this.el.addEventListener( 'raycaster-cursor-up', event => {
				if ( !this.el.sceneEl.is( 'interactive' ) ) return;
				if ( this.el.sceneEl.is( 'modal' ) ) return;

				this.el.emit( 'clicked', this.el.intersection, null );
			});

			this.el.sceneEl.addEventListener( 'child-attached', this.calcBounds.bind( this ) );
			this.el.sceneEl.addEventListener( 'child-detached', this.calcBounds.bind( this ) );
			this.el.sceneEl.addEventListener( 'mesh-added', this.calcBounds.bind( this ) );
		},

		/**
		 * Calculates the sphere scale such that it encompasses every clickable object in the scene
		 */
		calcBounds: function() {
			var maxDistance = 0;
			var els = Array.from( document.querySelectorAll( '.clickable:not(.ignoreBounds):not([boundary-sphere])' ) );

			els.forEach( el => {
				if ( el.object3D ) {
					el.object3D.getWorldPosition( this.elWorldPosition );
					maxDistance = Math.max( maxDistance, this.elWorldPosition.length() );
				}
			});

			// Make the radius a bit bigger than the farthest-away object,
			// otherwise if the user is close to that object, the cursor will
			// hit very close to it and will look big and weird.
			this.el.object3D.scale.copy( VECTOR_ONE );
			this.el.object3D.scale.multiplyScalar( maxDistance / 1.75 );
		}
	});
}
