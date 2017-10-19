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
 * StaticPlatformUtils
 *
 * Singleton class which contains various platform-checking functions.
 */
import { Scene } from '../core/scene';

class StaticPlatformUtils {

	/**
	 * Returns true if the user is on a mobile device
	 */
	isMobile() {
    	return AFRAME.utils.device.isMobile();
    }

	/**
	 * Returns true if the user is on a gear vr device
	 */
	isGearVR() {
    	return AFRAME.utils.device.isGearVR();
    }

    /**
     * Returns true if the device is a tablet.
     * Checks the aspect ratio and userAgent for confirmation.
     */
    isTablet() {
    	return Math.max( window.screen.width, window.screen.height ) / Math.min( window.screen.width, window.screen.height ) < 1.35 &&
        	!( /(Oculus|Gear)/ ).test( navigator.userAgent );
    }

    /**
     * Returns true if the user is in 360 mode
     */
    is360() {
        return Scene.modeType === '360';
    }

    isIOSSafari() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return ( /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream );
    }

    /**
     * Returns true if the given component is enabled for the current platform
     */
    isEnabledOnPlatform( component ) {
	    if ( component.el.hasAttribute( 'mobile-only' ) ) {
	        return AFRAME.utils.device.isMobile();
	    }

	    if ( component.el.hasAttribute( 'desktop-only' ) ) {
	        return !AFRAME.utils.device.isMobile();
	    }

	    return true;
	}

	/**
     * Returns true if MP4 is supported
     */
	isMp4Supported() {
		return ( !!document.createElement( 'video' ).canPlayType( 'video/mp4; codecs=avc1.42E01E,mp4a.40.2' ) );
	}

	/**
	 * Async function which calls a given callback with either 'mouse-touch' or 'controller',
	 * depending on the user's controller type. The controller type is derived from the VR display
	 * name, if any are found.
	 */
	getControllerType( callBack ) {
	    navigator.getVRDisplays().then( displays => {

            const isFullHDDisplay = displays.length > 0 && displays[ 0 ].isPresenting;

            if( isFullHDDisplay ) {
            	const display = displays[ 0 ];

                if ( display.displayName.includes( 'Cardboard' ) ) {
                    callBack( 'mouse-touch', display.displayName );
                } else if ( display.displayName.includes( 'Daydream' ) || display.stageParameters === null ) {
                    callBack( 'controller', display.displayName );
                } else {
                    callBack( 'controller', display.displayName );
                }

            } else {
                callBack( 'mouse-touch', 'other' );
            }

        }).catch( displays => {
            callBack( 'mouse-touch', 'other' );
        });
	}

    /**
     * Adjust the panel's position depending on platform. On desktop, the
     * panel needs to be moved closer to the camera
     */
    getCardZOffset() {
        const isPortrait = window.innerHeight > window.innerWidth;
        const isMobile = AFRAME.utils.device.isMobile();
        const is360 = Scene.modeType === '360';
        var z = -1.75; // all vr
        z = ( is360 && !isMobile ) ? -1.25 : z; // 360 , desktop
        z = ( is360 && isMobile && isPortrait ) ? -2 : z; // 360, mobile, portrait
        z = ( is360 && isMobile && !isPortrait ) ? -1 : z; // 360, mobile, landscape
        return z;
    }
}

export let PlatformUtils = new StaticPlatformUtils();
