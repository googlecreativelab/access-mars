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
 * sky-shader
 *
 * A flat two-color gradient with an animated mask parameter.
 * Used by sky-gradient. Default color values provided by JPL.
 */

export const uniforms = {
	startColor: { type: 'c', value: new THREE.Color( 0xFFF9E8 ) },
	endColor: { type: 'c', value: new THREE.Color( 0xE1CBB2 ) },
	animIn: { type: '1f', value: 1 }
};

export const vertexShader = [
	
	'varying vec2 vUVa;',
	'varying vec2 vUVb;',

	'void main() {',
		'vUVa = min( ( 1.0 - uv ) + 0.5, 1.0 );',
		'vUVb = uv;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		
	'}'

].join( '\n' );

export const fragmentShader = [
	
	'uniform vec3 startColor;',
	'uniform vec3 endColor;',
	'uniform float animIn;',

	'varying vec2 vUVa;',
	'varying vec2 vUVb;',

	'void main() {',
		'if ( vUVb.y > animIn ) discard;',
		'gl_FragColor = vec4( mix( startColor, endColor, vUVa.y ), 1.0 );',
	'}'

].join( '\n' );