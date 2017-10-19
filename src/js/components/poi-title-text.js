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
 * poi-title-text
 *
 * UI component for displaying point-of-interest title text.
 *
 * The text has an animated fade-in/out animation which is triggered
 * when the 'visible' attribute is changed.
 */

const BezierEasing = require( 'bezier-easing' );

const ACTIVE_TIME = 0.5;
const ACTIVE_Y = 10;
const EASING = BezierEasing( 0.7, 0, 0.2, 1 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'poi-title-text', {

		schema: {
			align: { default: 'center' },
			anchor: { default: 'center' },
			letterSpacing: { default: 12 },
			value: { type: 'string' },
			yOffset: { type: 'number' },
			show: { default: false },
			showTime: { default: ACTIVE_TIME },
			width: { default: 750 },
			wrapCount: { default: 40 }
		},

		init: function() {
			this.opacity = 0;
			this.yOffset = 0;
			this.updateOpacity = false;
			this.updateYOffset = false;

			this.el.setAttribute( 'text', {
				align: this.data.align,
				alphaTest: 0.5,
				anchor: this.data.anchor,
				color: new THREE.Color( 0xFFFFFF ),
				font: 'fonts/NowAlt-Bold.json',
				letterSpacing: this.data.letterSpacing,
				shader: 'msdf',
				transparent: true,
				opacity: this.opacity,
				value: this.data.value,
				width: this.data.width,
				wrapCount: this.data.wrapCount
			});
		},

		update: function() {
			this.el.setAttribute( 'text', {
				align: this.data.align,
				alphaTest: 0.5,
				anchor: this.data.anchor,
				letterSpacing: this.data.letterSpacing,
				value: this.data.value,
				width: this.data.width,
				wrapCount: this.data.wrapCount
			});

			this.el.setAttribute( 'position', {
				y: this.data.yOffset - ACTIVE_Y
			});
		},

		tick: function( t, dt ) {
			dt = ( dt / 1000 ) * ( 1 / this.data.showTime );

			if ( this.data.show ) {
				this.updateOpacity = this.opacity < 1;
				this.updateYOffset = this.yOffset < 1;
				this.opacity = Math.min( 1, this.opacity + dt );
				this.yOffset = Math.min( 1, this.yOffset + dt );
			} else {
				this.updateOpacity = this.opacity > 0;
				this.updateYOffset = this.yOffset > 0;
				this.opacity = Math.max( 0, this.opacity - dt );
				this.yOffset = Math.max( 0, this.yOffset - dt );
			}

			this.el.setAttribute( 'visible', this.opacity > 0 );

			if ( this.updateOpacity ) {
				this.el.setAttribute( 'text', {
					opacity: EASING( this.opacity )
				});
			}

			if ( this.updateYOffset ) {
				this.el.setAttribute( 'position', {
					y: this.data.yOffset - ( ACTIVE_Y - ( EASING( this.yOffset ) * ACTIVE_Y ) )
				});
			}
		}
	});
}
