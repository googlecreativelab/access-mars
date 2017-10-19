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
 * poi-spin-widget
 *
 * Spinning icon mesh used by the POI markers. Handles loading
 * the icon model and any animation.
 */

import { Scene } from '../core/scene';
import { C4DExportLoader } from '../c4d/c4d-export-loader';
import { C4DUtils } from '../c4d/c4d-utils';
import { MathUtils } from '../utils/math-utils';
import { POIAnimInDelay } from './poi-marker';

const BezierEasing = require( 'bezier-easing' );

const FLIP_X_VECTOR = new THREE.Vector3( -1, 1, 1 );

const ANIM_IN_DURATION = 0.7;
const ANIM_IN_DELAY = 0.25;
const ANIM_IN_EASING = BezierEasing( 0.6, 0, 0.3, 1 );

const START_Y_OFFSET = -1.5;
const BASE_ROT_SPEED = 0.01;

const HOVER_ROT = new THREE.Quaternion().setFromEuler( new THREE.Euler( 0, Math.PI + Math.PI / 4, 0 ) );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'poi-spin-widget', {

		schema: { type: 'string' },

		init: function() {
			this.animIn = 0;
			this.prevAnimIn = 0;
			this.hoverIn = 0;
			this.prevHoverIn = 0;
			this.rotSpeed = 0.01;

			const loader = new C4DExportLoader();
			loader.load( 'markers/' + this.data + '.glb' ).then( response => {

				this.iconObject = response.scene;
				this.iconObject.scale.copy( FLIP_X_VECTOR );
				this.el.setObject3D( 'mesh', this.iconObject );
				this.el.emit( 'load-complete', null, false );

				// Save the icon's initial scale, which is used later during animation.
				this.initialScale = this.iconObject.children[ 0 ].scale.clone();

				this.reset();
			});

			this.el.addEventListener( 'stateadded', event => {
				if ( event.detail.state === 'visible' ) {
					this.reset();
				}

				if ( event.detail.state === 'hover' ) {
					this.initialRot = this.iconObject.quaternion;
				}
			});
		},

		/**
		 * Reset mesh's scale and position to the offset values. Epsilon is used here
		 * to prevent a scale of zero while still being too small to see from reasonable
		 * camera distances.
		 */
		reset: function() {
			if ( !this.iconObject ) return;
			this.animIn = -( ANIM_IN_DELAY + POIAnimInDelay );
			this.iconObject.children[ 0 ].scale.set( 1, 1, 1 ).multiplyScalar( Number.EPSILON );
			this.iconObject.children[ 0 ].position.set( 0, START_Y_OFFSET, 0 );
		},

		tick: function( t, dt ) {
			if ( !this.el.parentNode.parentNode.getAttribute( 'visible' ) ) return;
			if ( !this.el.is( 'visible' ) ) return;
			if ( !this.iconObject ) return;

			// Adjust delta time so that it is 0..1 over ANIM_IN_DURATION seconds
			dt = ( dt / 1000 ) * ( 1 / ANIM_IN_DURATION );

			// Roll the transition animation forward to 1 if this element is visible,
			// otherwise roll it back to 0.
			if ( this.el.is( 'visible' ) ) {
				this.animIn += dt;
			} else {
				this.animIn -= dt;
			}

			// Roll the hover animation forward to 1 if this element is hovered,
			// otherwise reset it to zero immediately.
			if ( this.el.is( 'hover' ) ) {
				this.hoverIn += dt;
			} else {
				this.hoverIn = 0;
			}

			// Clamp and apply easing to the animIn and hoverIn value
			const easedAnimIn = ANIM_IN_EASING( MathUtils.clamp( this.animIn, 0, 1 ) );
			const easedHoverIn = ANIM_IN_EASING( MathUtils.clamp( this.hoverIn, 0, 1 ) );

			// Update object's animated scale. Again, epsilon is added here to prevent a scale of zero.
			const scale = Number.EPSILON + easedAnimIn;
			this.iconObject.children[ 0 ].scale.copy( this.initialScale ).multiplyScalar( scale );

			// Update object's animated position on the y-axis. 
			// This is interpolated between the offset constant and 0.
			this.iconObject.children[ 0 ].position.set( 0, MathUtils.lerp( START_Y_OFFSET, 0, easedAnimIn ), 0 );

			// Update the object's rotation speed. Use a sine to get a curve that starts at 0, ramps to 1, 
			// and ramps down to 0 again, between easedAnimIn = 0..1. That curve is multiplied by a 
			// factor of the BASE_ROT_SPEED to give a nice acceleration and deceleration.
			this.rotSpeed = BASE_ROT_SPEED + ( 20 * BASE_ROT_SPEED * Math.sin( Math.PI * easedAnimIn ) );

			// Spin it right round, but ease it out on hover
			this.iconObject.rotateY( this.rotSpeed * ( 1 - easedHoverIn ) );

			// Slerp the rotation to a static 45º rotation on hover
			if ( this.hoverIn > 0 ) {
				THREE.Quaternion.slerp( this.initialRot, HOVER_ROT, this.iconObject.quaternion, easedHoverIn );
			}
		}
	});
}
