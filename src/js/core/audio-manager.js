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
 * AudioManager
 *
 * Singleton class which handles voice-over and sound fx playback.
 */

import sono from 'sono';
import { Scene } from './scene';

class StaticAudioManager {

	constructor() {
		this.currentVO = null;
		this.disableVO = false;
		this.disableSFX = false;

		const audio = document.createElement( 'audio' );
		const status = !!( audio.canPlayType && audio.canPlayType( 'audio/mpeg;' ).replace( /no/, '' ) );
		this.format = status ? '.mp3' : '.ogg';
	}

	playVO( name, delay = 0 ) {
		this.stopVO();

		if ( this.disableVO ) return;

		this.currentVO = sono.create( 'vo/' + name + this.format );

		// Play the VO with a given delay
		this.currentVO.play( delay );

		return this.currentVO;
	}

	stopVO() {
		if ( this.currentVO ) {
			this.currentVO.stop();
		}
	}

	playSFX( name , isByPassed ) {
		this.currentSFX = sono.create( 'sfx/' + name + this.format );

		if ( !this.disableSFX || isByPassed) {
			this.currentSFX.play();
		}

		return this.currentSFX;
	}

	playAtmosphere( name ) {
		if ( this.disableAtmosphere ) return;
		this.currentAtmosphere = sono.create( 'sfx/atmosphere' + this.format );
		this.currentAtmosphere.loop = true;
		this.currentAtmosphere.volume = 0.4;
		this.currentAtmosphere.play();
	}
}

export let AudioManager = new StaticAudioManager();
