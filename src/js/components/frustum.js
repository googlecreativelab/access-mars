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
 * frustum
 *
 * Calculates the frustum of the element's camera component and
 * throws a 'frustum-updated' event every frame with the updated 
 * frustum object.
 *
 * Used for determining which POI markers are in view of the camera.
 */

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'frustum', {

		init: function() {
			this.matrix = new THREE.Matrix4();
			this.frustum = new THREE.Frustum();
		},

		tick: function() {
			if ( !this.camera ) {
				this.camera = this.el.components.camera.camera;
			}

			if ( !this.camera ) return;

			this.camera.matrixWorldInverse.getInverse( this.camera.matrixWorld );
			this.matrix.multiplyMatrices( this.camera.projectionMatrix, this.camera.matrixWorldInverse );
			this.frustum.setFromMatrix( this.matrix );

			this.el.emit( 'frustum-updated', { frustum: this.frustum }, false );
		}
	});
}