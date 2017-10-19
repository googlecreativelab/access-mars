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
 * map-marker
 *
 * UI component for a single pin-point marker. Used by map-card
 * to mark the location of each terrain site on the rover path.
 */

import { TextColor, TextLightColor, TextLightColorHex } from '../core/colors';

const ColorMaskShader = require( '../shaders/color-mask-shader' );
const BezierEasing = require( 'bezier-easing' );

const PLANE_GEO = new THREE.PlaneBufferGeometry( 1, 1 );
const EASING = BezierEasing( 0.66, 0, 0.33, 1 );
const XFADE_DURATION = 0.4;

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'map-marker', {

		schema: {
			index: { default: 1 },
			site: { type: 'string' }
		},

		init: function() {
			this.animIn = 0;
			this.crossfade = 0;
			this.color = TextLightColor.clone();
			this.parentCard = document.getElementById( 'map-card' );

			// Create the material for the marker icon
			this.material = new THREE.ShaderMaterial({
				uniforms: THREE.UniformsUtils.clone( ColorMaskShader.uniforms ),
				vertexShader: ColorMaskShader.vertexShader,
				fragmentShader: ColorMaskShader.fragmentShader,
				transparent: true,
				depthTest: false
			});

			// Load the marker icon texture
			const textureLoader = new THREE.TextureLoader();
			textureLoader.load( 'img/go-icon.png', texture => {
				this.material.uniforms.map.value = texture;
				this.material.uniforms.color.value = this.color;
				this.material.needsUpdate = true;
			});

			// Create the marker icon mesh
			this.mesh = new THREE.Mesh( PLANE_GEO, this.material );
			this.mesh.scale.multiplyScalar( 0.075 );
			this.el.setObject3D( 'mesh', this.mesh );

			// Create number text entity
			this.numberLabel = document.createElement( 'a-entity' );
			this.numberLabel.setAttribute( 'position', { x: 0, y: 0.01, z: 0 } );
			this.numberLabel.setAttribute( 'info-card-text', {
				align: 'center',
				baseline: 'bottom',
				color: TextLightColorHex,
				font: 'fonts/NowAlt-Medium.json',
				letterSpacing: 3,
				value: '0' + this.data.index,
				width: 0.32,
				wrapCount: 8
			});

			this.el.appendChild( this.numberLabel );

			// Add the 'visible' state to the child entities whenever the parent card adds it.
			this.parentCard.addEventListener( 'stateadded', event => {
				if ( event.detail.state !== 'visible' ) return;
				this.numberLabel.addState( 'visible' );
			});

			// Remove the 'visible' state to the child entities whenever the parent card removes it.
			this.parentCard.addEventListener( 'stateremoved', event => {
				if ( event.detail.state !== 'visible' ) return;
				this.numberLabel.removeState( 'visible' );
			});

			// Listen for site-hover events from the map-card component and set the selected
			// state if the matching map-site-card has been hovered over.
			this.parentCard.addEventListener( 'site-hover', event => {
				if ( event.detail === this.data.site ) {
					this.el.addState( 'selected' );
				} else {
					this.el.removeState( 'selected' );
				}
			});
		},

		update: function() {
			// Update the number label's value
			this.numberLabel.setAttribute( 'text', {
				value: '0' + this.data.index
			});
		},

		tick: function( t, dt ) {
			dt = ( dt / 1000 ) * ( 1 / XFADE_DURATION );

			if ( this.el.is( 'selected' ) ) {
				this.crossfade = Math.min( 1, this.crossfade + dt );
			} else {
				this.crossfade = Math.max( 0, this.crossfade - dt * 2 );
			}

			if ( this.parentCard.is( 'visible' ) ) {
				this.animIn = Math.min( 1, this.animIn + dt );
			} else {
				this.animIn = Math.max( 0, this.animIn - dt * 2 );
			}

			this.color = TextLightColor.clone();
			this.color.lerp( TextColor, EASING( this.crossfade ) );

			this.material.uniforms.color.value = this.color;
			this.material.uniforms.opacity.value = EASING( this.animIn );
		}
	});
}
