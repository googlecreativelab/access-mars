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
 * tests compatibility for analytics
 *
 */

import { PlatformUtils } from '../utils/platform-utils';

export function testCompatibility() {

	// headset controller
	PlatformUtils.getControllerType( ( clientType, info ) => {
		ga( 'send', 'event', 'VRPage', 'HeadsetCheck', info );
	});

	// controller
	window.addEventListener('gamepadconnected', e => {
		let gamepads = navigator.getGamepads();
		for (let i = 0; i < gamepads.length; ++i) {
			if(gamepads[i]){
				ga( 'send', 'event', 'VRPage', 'ControllerCheck', gamepads[i].id );
			}
		}
	});

	// audio context
	try {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		const context = new AudioContext();
		ga( 'send', 'event', 'init', 'supported', 'web-audio' );
	} catch( e ) {
		ga( 'send', 'event', 'init', 'unsupported', 'web-audio' );
	}
}
