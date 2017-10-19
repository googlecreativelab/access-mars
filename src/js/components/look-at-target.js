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
 * look-at-target
 *
 * Camera- and parent-independent look-at component.
 * Target is an element selector.
 *
 * Can limit rotation to a given axis, specified by a string: 
 * 'xyz', 'xy', 'z', etc. Defaults to 'y'.
 */

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'look-at-target', {

		schema: {
			axis: { type: 'string', default: 'y' },
			offset: { type: 'vec3', default: new THREE.Vector3() },
			target: { type: 'string', default: '#camera' },
			alwaysUpdate: { type: 'boolean', default: true }
		},

		init: function() {
			this.lookAtMatrix = new THREE.Matrix4();
			this.lookAtEyeVector = new THREE.Vector3();
			this.lookAtTargetVector = new THREE.Vector3();
			this.previousEuler = new THREE.Euler();
			this.euler = new THREE.Euler();
			this.needsUpdate = true;
			this.target = null;
			this.updateTimer = 0;
		},

		update: function() {
			this.target = document.querySelector( this.data.target );
			this.needsUpdate = true;
			this.updateTimer = 1;
		},

		tick: function( t, dt ) {
			if ( !this.el.object3D ) return;
			if ( !this.target.object3D ) return;
			if ( !this.data.alwaysUpdate && !this.needsUpdate ) return;

			if ( this.data.axis === 'y' ) {

				//Calculate world absolute rotation matrix
				this.lookAtEyeVector.setFromMatrixPosition( this.el.object3D.matrixWorld );
				this.lookAtTargetVector.setFromMatrixPosition( this.target.object3D.matrixWorld );
				this.lookAtMatrix.lookAt( this.lookAtEyeVector, this.lookAtTargetVector, this.el.object3D.up );

				this.el.object3D.quaternion.setFromRotationMatrix( this.lookAtMatrix );

				this.euler.x = this.data.offset.x + ( this.data.axis.includes( 'x' ) ? this.el.object3D.rotation.x : 0 );
				this.euler.y = this.data.offset.y + ( this.data.axis.includes( 'y' ) ? this.el.object3D.rotation.y : 0 );
				this.euler.z = this.data.offset.z + ( this.data.axis.includes( 'z' ) ? this.el.object3D.rotation.z : 0 );
				this.el.object3D.setRotationFromEuler( this.euler );
				
			} else {
				this.el.object3D.lookAt( this.target.object3D.getWorldPosition() );
			}

			this.updateTimer = Math.max( 0, this.updateTimer - ( dt / 1000 ) );

			if ( this.updateTimer <= 0 ) {
				this.needsUpdate = false;
			}
		}
	});
}

