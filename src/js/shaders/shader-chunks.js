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
 * Common bits of reused shader code.
 */

// Fog vertex shader parameters
export const FogParamsVertex = [
	'varying float fogDepth;'
].join( '\n' );

// Fog vertex shader calculations
export const FogVertex = [ 
	'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
	'fogDepth = -mvPosition.z;'
].join( '\n' );

// Fog fragment shader parameters
export const FogParamsFrag = [
	'#define LOG2 1.442695',
	'uniform vec3 fogColor;',
	'uniform float fogDensity;',
	'varying float fogDepth;'
].join( '\n' );

// Fog fragment shader calculations
export const FogFrag = [
	'float fogFactor = 1.0 - saturate( exp2( -fogDensity * fogDensity * fogDepth * fogDepth * LOG2 ) );',
	'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );'
].join( '\n' );