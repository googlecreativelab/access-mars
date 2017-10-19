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
 * sky-gradient
 *
 * Simple skybox component with a two-color gradient shader
 * and an animated transition mask effect.
 */

import { Scene } from '../core/scene';
import { FogColor } from '../core/colors';

const BezierEasing = require( 'bezier-easing' );
const SkyShader = require( '../shaders/sky-shader' );

const ANIM_DURATION = 1.5;
const SKY_GEO = new THREE.SphereBufferGeometry( 5000, 64, 20 );
const EASING = BezierEasing( 0.66, 0, 0.33, 1 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'sky-gradient', {

		dependencies: [ 'visible' ],

		schema: { 
			animIn: { default: 0 }
		},

		init: function() {
			this.animIn = this.data.animIn;
			this.material = new THREE.ShaderMaterial({
				uniforms: SkyShader.uniforms,
				vertexShader: SkyShader.vertexShader,
				fragmentShader: SkyShader.fragmentShader,
				side: THREE.DoubleSide,
				fog: false
			});

			this.mesh = new THREE.Mesh( SKY_GEO, this.material );
			this.el.setObject3D( 'mesh', this.mesh );

			Scene.on( 'initial-load-complete', event => {
				this.el.addState( 'visible' );
			});
		},

		update: function() {
			this.material.uniforms.animIn.value = 0.5 + this.data.animIn / 2;
			this.material.needsUpdate = true;
		},

		tick: function( t, dt ) {
			dt = ( dt / 1000 ) * ( 1 / ANIM_DURATION );
			var updateTransition = false;
			var deltaTransition = 0;

			// Calculate transition delta amount
			if ( this.el.is( 'visible' ) ) {
				updateTransition = this.animIn < 1;
				deltaTransition = +dt;
			} else {
				updateTransition = this.animIn > 0;
				deltaTransition = -1;
			}

			if ( this.animIn <= 0 ) {
				this.el.setAttribute( 'visible', false );
			} else {
				this.el.setAttribute( 'visible', true );
			}

			if ( updateTransition ) {
				this.animIn = Math.min( Math.max( this.animIn + deltaTransition, 0 ), 1 );
				this.el.setAttribute( 'sky-gradient', { 
					animIn: this.animIn 
				});
			}
		}
	});
}