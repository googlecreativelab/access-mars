/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * exit-button
 *
 */

import { PlatformUtils } from '../utils/platform-utils';
const screenfull = require( 'screenfull' );

const SHOW_DELAY_MS = 10;

export class ExitButton {

	constructor() {
		this.el = document.querySelector( '#exitButton' );

		// Reload the page when the exit button is clicked. This will
		// return the user to the splash page.
		this.el.addEventListener( 'click', () => {
			this.hide()
		});

		this.scene = document.querySelector( 'a-scene' );
		this.scene.addEventListener( 'enter-360', () => this.show() );
		this.scene.addEventListener( 'enter-vr', () => this.show() );

		// Hide the button when VR is exited
		this.scene.addEventListener( 'exit-vr', () => this.hide() );
	}

	show() {
		setTimeout( () => {
			const isMobile = PlatformUtils.isMobile();
			const is360 = PlatformUtils.is360();

			if ( !isMobile || ( isMobile && is360 ) ) {
				this.el.classList.add( 'visible' );
			}
		}, SHOW_DELAY_MS );
	}

	hide() {

		let windowRef = window.location.href.split( '?' )[ 0 ];
		if ( window.location !== windowRef ) {
			window.location.href = windowRef;
		} else {
			window.location.reload(false);
		}
		this.el.classList.remove( 'visible' );
	}
}
