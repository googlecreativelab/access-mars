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
 * fade-to-black
 *
 * A black sphere which encloses the camera and can
 * be faded in and out during scene transitions.
 *
 * It is triggered automatically by the 'visible' state
 * of the AFRAME scene
 */

// Duration of the fade transition, in seconds
const FADE_DURATION = 1.25;

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'fade-to-black', {

		dependencies: [ 'visible' ],

		init: function() {
			this.opacity = 1;
			this.geometry = new THREE.SphereBufferGeometry( 1.5 );
			this.material = new THREE.MeshBasicMaterial({
				color: new THREE.Color( 0 ),
				opacity: this.opacity,
				side: THREE.BackSide,
				transparent: true
			});

			this.mesh = new THREE.Mesh( this.geometry, this.material );
			this.mesh.renderOrder = 8;
			this.el.setObject3D( 'mesh', this.mesh );

			// When the scene's visible state is ADDED, fade the sphere out
			this.el.addEventListener( 'stateadded', event => {
				if ( event.detail !== 'visible' ) return;
				this.el.emit( 'transition-in-begin', null, false );
			});

			// When the scene's visible state is REMOVED, fade the sphere in
			this.el.addEventListener( 'stateremoved', event => {
				if ( event.detail == 'visible' ) return;
				this.el.emit( 'transition-out-begin', null, false );
			});
		},

		tick: function( t, dt ) {
			dt = ( dt / 1000 ) * ( 1 / FADE_DURATION );
			var updateTransition = false;
			var deltaOpacity = 0;

			if ( this.el.is( 'visible' ) ) {
				updateTransition = this.opacity < 1;
				deltaOpacity = +dt;
			} else {
				updateTransition = this.opacity > 0;
				deltaOpacity = -dt;
			}

			// Hide the mesh itself if it's at 0 opacity, so it doesn't
			// get rendered while it's invisible.
			if ( this.opacity <= 0 ) {
				this.el.setAttribute( 'visible', false );
			} else {
				this.el.setAttribute( 'visible', true );
			}

			// Only update the material if the opacity value is being changed
			if ( updateTransition ) {
				this.opacity = Math.min( Math.max( this.opacity + deltaOpacity, 0 ), 1 );
				this.material.opacity = this.opacity;
				this.material.needsUpdate = true;

				if ( this.opacity <= 0 ) {
					this.el.emit( 'transition-out-complete', null, false );
					return;
				}

				if ( this.opacity >= 1 ) {
					this.el.emit( 'transition-in-complete', null, false );
				}
			}
		}
	});
}
