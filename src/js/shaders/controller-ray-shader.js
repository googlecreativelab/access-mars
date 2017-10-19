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
 * controller-ray-shader
 *
 */

export const uniforms = {
	dashSpacing: { value: 0.3 },
	dashSize: { value: 0.5 },
	t: { value: 0.0 },
	axis: { value: new THREE.Vector2( 0, 1 ) },
	show: { value: 1.0 }
};

export const vertexShader = [

	'varying vec2 vUV;',

	'void main() {',
		'vUV = uv;',
		'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
	'}'

].join( '\n' );

export const fragmentShader = [

	'uniform float rayLength;',
	'uniform float dashSpacing;',
	'uniform float dashSize;',
	'uniform float t;',
	'uniform float show;',
	'uniform vec2 axis;',

	'varying vec2 vUV;',

	'void main() {',
		'float uv = length( vUV * axis );',
		'if ( uv > show ) discard;',
		'float d = fract( uv * ( 1.0 / dashSpacing ) - t );',
		'if ( d < 1.0 - dashSize ) discard;',
		'gl_FragColor = vec4( 1.0 );',
	'}'

].join( '\n' );
