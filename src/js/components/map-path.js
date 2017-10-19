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
 * map-path
 *
 * UI component for displaying the animated path line on the map card. 
 * 
 * The path line is filled in based on what site marker the 
 * user has selected.
 *
 * The path mesh is loaded from a GLTF file, and the path
 * fill animation is smoothed using a cubic easing curve.
 */

import { TextColor, TextLightColor } from '../core/colors';
import { GLTFLoader } from '../loaders/gltf-loader';
import { MathUtils } from '../utils/math-utils';
import { C4DUtils } from '../c4d/c4d-utils';

const BezierEasing = require( 'bezier-easing' );
const MapPathShader = require( '../shaders/map-path-shader' );

// Line fill percentages for each terrain site
const SITE_FILLS = {
	'landing_site': 0,
	'pahrump_hills': 0.67,
	'marias_pass': 0.765,
	'murray_buttes': 0.88,
	'live_site': 1
};

const SMOOTH_TIME = 0.25;
const MAX_SMOOTH_SPEED = 500;
const ANIM_IN_DURATION = 0.25;
const EASING = BezierEasing( 0.66, 0, 0.33, 1 );

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'map-path', {

		schema: {
			site: { type: 'string', default: 'landing_site' },
			width: { type: 'number', default: 2 }
		},

		init: function() {
			this.currentSite = this.data.site;
			this.currentFillValue = 0;
			this.targetFillValue = 0;
			this.fillVelocity = 0;
			this.animIn = 0;

			// Create a MapPathShader material
			this.material = new THREE.ShaderMaterial({
				uniforms: THREE.UniformsUtils.clone( MapPathShader.uniforms ),
				vertexShader: MapPathShader.vertexShader,
				fragmentShader: MapPathShader.fragmentShader,
				transparent: true,
				depthTest: false
			});

			// Set material uniforms
			this.material.uniforms.colorA.value = TextLightColor;
			this.material.uniforms.colorB.value = TextColor;
			this.material.uniforms.opacity.value = 0;

			// Load and set up the map path mesh
			GLTFLoader.load( 'map/map-path.glb' ).then( result => {
				this.mesh = C4DUtils.getChildWithType( result.gltf.scene, 'Mesh' );
				this.mesh.scale.multiplyScalar( this.data.width / 10 );
				this.mesh.position.setZ( 0.002 );
				this.mesh.material = this.material;
				this.el.setObject3D( 'mesh', this.mesh );
			});
		},

		update: function() {
			if ( this.data.site !== 'current' ) this.currentSite = this.data.site;
			this.targetFillValue = SITE_FILLS[ this.currentSite ];
		},

		tick: function( t, dt ) {
			dt = dt / 1000;

			const dtAnimIn = dt * ( 1 / ANIM_IN_DURATION );

			if ( this.el.is( 'visible' ) ) {
				this.animIn = Math.min( 1, this.animIn + dtAnimIn );
			} else {
				this.animIn = Math.max( 0, this.animIn - dtAnimIn * 2 );
			}

			this.material.uniforms.opacity.value = EASING( this.animIn );

			if ( this.currentFillValue != this.data.fill ) {

				// Calculate a smoothed value for the line stroke length using a cubic polynomial curve.
				// This allows the user to flip between any of the sites while having the line stroke length
				// smoothly adjust without having to maintain any delays or time state information.
			 	const smooth = MathUtils.smooth1D( this.currentFillValue, this.targetFillValue, this.fillVelocity, dt, 0.25, 500 );
			 	this.fillVelocity = smooth.velocity;
			 	this.currentFillValue = smooth.value;
			 	
				// current, target, velocity, dt, smoothTime smoothMax ) {
				// const t = 2 / SMOOTH_TIME;
				// const t2 = t * dt;
				// const cubic = 1 / ( 1 + t2 + 0.48 * t2 * t2 + 0.235 * t2 * t2 * t2 );
				// const limit = MAX_SMOOTH_SPEED * SMOOTH_TIME;
				// const delta = this.currentFillValue - this.targetFillValue;
				// const error = MathUtils.clamp( delta, -limit, limit );
				// const d = ( this.fillVelocity + t * error ) * dt;
				// this.fillVelocity = ( this.fillVelocity - t * d ) * cubic;
				// this.currentFillValue = ( this.currentFillValue - error ) + ( d + error ) * cubic;

				this.material.uniforms.fill.value = 1.0 - this.currentFillValue;
			}
		}
	});
}