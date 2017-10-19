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
 * info-card-text
 *
 * UI component for displaying the text on info cards.
 *
 * Because the text takes a frame for layout, its size
 * cannot be absolutely known at construction time.
 * In order to size the parent info card correctly,
 * the text's bounding box is emitted once layout
 * is complete.
 *
 * The text has an animated fade-in/out animation
 * which is triggered when the 'visible' attribute
 * is changed.
 */

import { TextColorHex } from '../core/colors';
import { MathUtils } from '../utils/math-utils';

function parseText( text ) {
	return text.replace( new RegExp( '@s', 'g' ), ';' )	;
}

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'info-card-text', {

		schema: {
			align: { default: 'left' },
			antialiasing: { default: 0.25 },
			baseline: { default: 'top' },
			color: { type: 'number', default: TextColorHex },
			font: { type: 'string' },
			letterSpacing: { default: 1 },
			lineHeight: { default: 80 },
			show: { default: true },
			transitionInDelay: { default: 0.05 },
			transitionInDuration: { default: 0.25 },
			transitionInSpeed: { default: 1 },
			transitionOutSpeed: { default: 2 },
			value: { type: 'string' },
			width: { default: 0.85 },
			wrapCount: { default: 32 }
		},

		init: function() {
			this.boundingBox = new THREE.Box3();
			this.textGeometry = null;
			this.size = new THREE.Vector3();
			this.updateTransition = false;
			this.geometryUpdated = false;
			this.opacity = 0;
			this.multiplier = 1;
			this.delayCounter = 0;

			this.el.setAttribute( 'text', {
				align: this.data.align,
				anchor: this.data.align,
				baseline: this.data.baseline,
				color: new THREE.Color( this.data.color ),
				font: this.data.font,
				letterSpacing: this.data.letterSpacing,
				lineHeight: this.data.lineHeight,
				opacity: 0,
				shader: 'msdf',
				value: parseText( this.data.value ),
				width: this.data.width,
				wrapCount: this.data.wrapCount,
			});

			this.el.addEventListener( 'stateadded', event => {
				if ( event.detail.state !== 'visible' ) return;
				if ( this.transitionInDelay <= 0 ) return;
				this.delayCounter = 1;
			});

			this.el.addEventListener( 'stateremoved', event => {
				if ( event.detail.state !== 'visible' ) return;
				this.delayCounter = 0;
			});
		},

		update: function() {
			this.el.setAttribute( 'text', 'letterSpacing', this.data.letterSpacing );
			this.el.setAttribute( 'text', 'lineHeight', this.data.lineHeight );
			this.el.setAttribute( 'text', 'wrapCount', this.data.wrapCount );
			this.el.setAttribute( 'text', 'width', this.data.width );
			this.el.setAttribute( 'text', 'value', parseText( this.data.value ) );
			this.el.setAttribute( 'text', 'opacity', Math.max( 0, this.opacity ) );
			this.size = new THREE.Vector3();
			this.geometryUpdated = false;
			this.opacity = 0;

			// Force the text to always be render in front
			this.text = this.el.object3D.children[ 0 ];
			this.text.material.depthTest = false;
			this.text.material.transparent = true;
			this.text.material.needsUpdate = true;
		},

		tick: function( t, dt ) {
			if ( this.delayCounter > 0 ) {
				dt = ( dt / 1000 ) * ( 1 / this.data.transitionInDelay );
			} else {
				dt = ( dt / 1000 ) * ( 1 / this.data.transitionInDuration );
			}

			if ( this.delayCounter > 0 ) {
				this.delayCounter -= dt;
				return;
			}

			// Update the fade-in transition animation
			if ( this.el.is( 'visible' ) ) {
				this.updateTransition = this.opacity < 1;
				this.opacity += dt * this.data.transitionInSpeed;
			} else {
				this.updateTransition = this.opacity > 0;
				this.opacity -= dt * this.data.transitionOutSpeed;
			}

			this.opacity = MathUtils.clamp( this.opacity, 0, 1 );

			if ( this.updateTransition ) {
				this.el.setAttribute( 'text', 'opacity', this.opacity );
			}

			// Wait until the text's geometry has a valid bounding box, which
			// means the text layout is complete and the dimensions are known.
			// Emit an event with the dimensions so that the parent info card's
			// size and the position of other elements can be set correctly.
			if ( !this.geometryUpdated ) {
				if ( this.el.object3D.children[ 0 ] ) {
					this.textGeometry = this.el.object3D.children[ 0 ].geometry;

					if ( this.textGeometry.attributes.position ) {
						if ( this.textGeometry.attributes.position ) {
							this.textGeometry.computeBoundingBox();
							this.textGeometry.boundingBox.getSize( this.size );
							this.size.multiply( this.el.object3D.children[ 0 ].scale );
						}
					}
				}

				if ( !isNaN( this.size.x ) && !isNaN( this.size.y ) ) {
					this.geometryUpdated = true;
					this.el.emit( 'geometry-updated', {
						width: this.size.x,
						height: this.size.y
					});
				}
			}
		}
	});
}
