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
 * map-background
 *
 * UI component for displaying the background map geometry 
 * on the map card. The geometry itself is loaded from a GLTF file.
 */

import { BGColor } from '../core/colors';
import { C4DUtils } from '../c4d/c4d-utils';
import { GLTFLoader } from '../loaders/gltf-loader';

const ColorAlphaShader = require( '../shaders/color-alpha-shader' );

const ANIM_IN_DURATION = 0.25;
const DELAY_DURATION = 0.18;

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'map-background', {
		
		schema: {
			width: { type: 'number', default: 2 }
		},

		init: function() {
			this.animIn = 0;
			this.delayCounter = 0;

			// Create a ColorAlphaShader material
			this.material = new THREE.ShaderMaterial({
				uniforms: THREE.UniformsUtils.clone( ColorAlphaShader.uniforms ),
				vertexShader: ColorAlphaShader.vertexShader,
				fragmentShader: ColorAlphaShader.fragmentShader,
				transparent: true,
				depthTest: false
			});

			// Set material uniforms
			this.material.uniforms.opacity.value = 0;
			this.material.uniforms.color.value = BGColor;

			// Load and set up the map path mesh
			GLTFLoader.load( 'map/map-bg.glb' ).then( result => {
				this.mesh = C4DUtils.getChildWithType( result.gltf.scene, 'Mesh' );
				this.mesh.scale.multiplyScalar( this.data.width / 10 );
				this.mesh.position.setZ( 0.001 );
				this.mesh.material = this.material;
				this.el.setObject3D( 'mesh', this.mesh );
			});

			// Reset the delay counter when the 'visible' state is added
			this.el.addEventListener( 'stateadded', event => {
				if ( event.detail.state !== 'visible' ) return;
				this.delayCounter = 1;
			})
		},

		tick: function( t, dt ) {
			if ( this.delayCounter > 0 ) {
				dt = ( dt / 1000 ) * ( 1 / DELAY_DURATION );
			} else {
				dt = ( dt / 1000 ) * ( 1 / ANIM_IN_DURATION );
			}

			if ( this.delayCounter > 0 ) {
				this.delayCounter -= dt;
				return;
			}

			if ( this.el.is( 'visible' ) ) {
				this.animIn = Math.min( 1, this.animIn + dt );
			} else {
				this.animIn = Math.max( 0, this.animIn - dt * 2 );
			}

			this.material.uniforms.opacity.value = this.animIn * 100;
		}
	});
}