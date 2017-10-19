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

// Fetch polyfill
import 'whatwg-fetch'

// Promise polyfill
import Promise from 'promise-polyfill';
if ( !window.Promise ) window.Promise = Promise;

require( 'aframe' );
require( 'aframe-daydream-controller-component' );

require( './third_party/three/gltf-loader' );
require( './third_party/three/draco-loader' );

require( './components/boundary-sphere' );
require( './components/intro-player' );
require( './components/rover' );
require( './components/intro-video' );
require( './components/terrain' );
require( './components/rover-poi' );
require( './components/debug-trace' );
require( './components/look-at-target' );
require( './components/better-raycaster' );
require( './components/controller-dot' );
require( './components/controller-ray' );
require( './components/controller-arc' );
require( './components/controller-parabola' );
require( './components/poi-title-text' );
require( './components/poi-spin-widget' );
require( './components/poi-pole' );
require( './components/poi-marker' );
require( './components/scene-intro-label' );
require( './components/horizon-marker' );
require( './components/map-card' );
require( './components/map-path' );
require( './components/map-marker' );
require( './components/map-site-card' );
require( './components/map-background' );
require( './components/info-card' );
require( './components/info-card-text' );
require( './components/orientation-card' );
require( './components/orientation-card-column' );
require( './components/frustum' );
require( './components/hitbox' );
require( './components/opacity' );
require( './components/fade-to-black' );
require( './components/sky-wireframe' );
require( './components/sky-gradient' );
require( './components/sky-blackout' );
require( './utils/compatibility' );

import { initSplash } from './splash/splash';
import { testCompatibility } from './utils/compatibility';

// Restore the crossOrigin property to its default value.
// AFRAME modifies it and breaks CORS in some versions of Safari.
THREE.TextureLoader.prototype.crossOrigin = undefined;
THREE.ImageLoader.prototype.crossOrigin = undefined;

// used to show the correct ui overlay in vr mode on mobile devices and daydream
if ( WebVRConfig ) {
	WebVRConfig.CARDBOARD_UI_DISABLED = true;
	WebVRConfig.ENABLE_DEPRECATED_API = true;
	WebVRConfig.ROTATE_INSTRUCTIONS_DISABLED = false;
}

document.addEventListener("DOMContentLoaded", () => {
	testCompatibility();
	initSplash();
});
