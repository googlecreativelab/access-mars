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
 * splash
 *
 */

import * as webvrui from 'webvr-ui/build/webvr-ui';
import { Scene } from '../core/scene';
import { PlatformUtils } from '../utils/platform-utils';
import { ExitButton } from './exit-button';
const screenfull = require( 'screenfull' );


const qs = require( 'qs' );

const SVG_360 = '<svg class="svg360" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve"><style type="text/css"> .icon360{fill:#846852;}.st1{fill:none;}</style><path class="icon360" d="M12,7C6.5,7,2,9.2,2,12c0,2.2,2.9,4.1,7,4.8V20l4-4l-4-4v2.7c-3.2-0.6-5-1.9-5-2.7c0-1.1,3-3,8-3s8,1.9,8,3c0,0.7-1.5,1.9-4,2.5v2.1c3.5-0.8,6-2.5,6-4.6C22,9.2,17.5,7,12,7z"/><path class="st1" d="M0,0h24v24H0V0z"/></svg>';

export function initSplash() {

    const container = document.body;
    const aScene = container.querySelector( 'a-scene' );
	const about = document.querySelector( '.about' );
	const footer = document.querySelector( '.footer' );
	const splash = document.querySelector( '.splash' );

    const parsedQueryString = qs.parse( location.search.slice( 1 ) );

	// Button for when VR is available but user might want 360 instead
	const tryItIn360 = document.getElementById( 'try-it-in-360' );

	// Container for the buttons
	const enterVRContainer = splash.querySelector( '#enter-vr-container' );

	// scene loaded is automatically resolved after a setTimeout
	const aSceneLoaded = new Promise( resolve => setTimeout( () => resolve() ) );

    const enterVR = document.createElement( 'button' );
    enterVR.classList.add( 'webvr-ui-button' );
    enterVR.innerHTML = '<div class="webvr-ui-title" style="display: initial;">TEST</div>';

	// create the webvr-ui Button
    const enterVRButton = new webvrui.EnterVRButton( null, {
        color: '#846852',
		corners : '4',
        textEnterVRTitle: 'loading'.toUpperCase()
	});


    enterVRButton.domElement.addEventListener( 'click', () => {
        playVideo();
        enterVRButton.setTitle( 'WAITING' );
    }, true);

    // create the Enter 360 Button that is full-size and replaces Enter VR
    function createEnter360Button() {
        enterVRContainer.innerHTML = '';
        const enter360 = document.createElement( 'button' );
        enter360.classList.add( 'webvr-ui-button' );
        enter360.innerHTML = '<div class="webvr-ui-title" style="padding: 0;">LOADING</div>';
        enterVRContainer.appendChild( enter360 );
        enter360.addEventListener( 'click', () => {
            playVideo();
            hideSplash();
            onEnter360();
        });
        tryItIn360.style.display = 'none';
        return enter360;
    }

	function hideSplash() {
        [ splash, footer, about ].forEach( el => el.classList.add( 'invisible' ) );
	}

    function showSplash() {
        [ splash, footer, about ].forEach( el => el.classList.remove( 'invisible' ) );
	}

    function playVideo() {
        const name = ( PlatformUtils.isMp4Supported() ) ? 'intro-video-mp4' : 'intro-video-webm';
        const el = document.getElementById( name );
		if ( el ) el.play();
    }

	// this can happen by "Enter 360" or "Try it in 360"
	function onEnter360() {
		aScene.play();
		aScene.emit( 'enter-360' );
        sceneEntered( '360' );
	}

    function onEnterVR() {
		aScene.play();
        aScene.enterVR();
        sceneEntered( 'vr' );
	}

    if( PlatformUtils.isTablet() ){
        createEnter360Button();
    }

	enterVRButton.on( 'ready', () => {
	    const display = enterVRButton.manager.defaultDisplay;

		if( !PlatformUtils.isTablet() ) {
            enterVRContainer.insertBefore(enterVRButton.domElement, enterVRContainer.firstChild);
        }

        if( !PlatformUtils.isGearVR() ) {
            tryItIn360.style.display = 'inline-block';
        }
	});

	enterVRButton.on( 'enter', () => {
        hideSplash();
		onEnterVR();
	});

	enterVRButton.on( 'exit', () => {
        showSplash();
		aScene.exitVR();
		aScene.pause();
	});

	enterVRButton.on( 'error', ()=>{
		if(enterVRButton.state === webvrui.State.ERROR_NO_PRESENTABLE_DISPLAYS || enterVRButton.state === webvrui.State.ERROR_BROWSER_NOT_SUPPORTED){
		    createEnter360Button();
		}
	});

    function tryToMakeFullScreen() {
        if (screenfull.enabled) {
            screenfull.request();
        }
    }

    aSceneLoaded
        //load the scene, say "loading"
        .then(()=>{

			// now that we have a renderer, make sure webvr-ui gets the canvas
			enterVRButton.sourceCanvas = aScene.renderer.domElement;

			// dont run the aScene in the background
            const isLinkFromiOS = parsedQueryString.site;
			if( !isLinkFromiOS ) aScene.pause();

			// add the loaded events
            tryItIn360.addEventListener( 'click', () => {
                // tryToMakeFullScreen();
                playVideo();
                hideSplash();
                onEnter360();
            });
		})

        // change text to "Enter **"
        .then(()=>{
			// audio and everything is loaded now
			enterVRContainer.classList.add( 'ready' );
			const always = () => {
                // if WebVR is available and its not polyfill on a tablet
                // if (enterVRButton.state === webvrui.State.READY_TO_PRESENT && !( PlatformUtils.isMobile() && PlatformUtils.isTablet())) {
                if (enterVRButton.state === webvrui.State.READY_TO_PRESENT && !( PlatformUtils.isMobile() && PlatformUtils.isTablet())) {
                    enterVRButton.setTitle( 'Enter VR'.toUpperCase() );
                } else if (PlatformUtils.isTablet() || ( enterVRButton.state || '' ).indexOf( 'error' ) >= 0) {

                    document.querySelector( '.webvr-ui-title' ).innerHTML = SVG_360 + '<span>ENTER 360</span>';
                    document.querySelector( '.webvr-ui-title' ).classList.add( 'mode360' );
                }
            };
            return enterVRButton.getVRDisplay()
                .then(always, always);
		})
        .catch(console.error.bind(console));

    function sceneEntered( modeType ) {

        // HACK to get the scene ready AFTER dom is ready on Mozilla
        setTimeout( () => {
            // Pulls site information from query string.
            // Defaults to landing_site.
            const site = parsedQueryString.site ? parsedQueryString.site : 'landing_site';

            // console.log( '' );
            // console.log( 'enter' );
            // console.log( 'modeType:', modeType );

            Scene.init( parsedQueryString );
            Scene.setModeType( modeType );
            Scene.loadSite( site );

            // gets controller type using
            PlatformUtils.getControllerType( ( clientType, info ) => {
                // console.log( 'controllerType:', clientType );
                // console.log( 'info:', info );
                Scene.setControllerType( clientType, info );
                Scene.tryAddingController( info );
            });

            ga( 'send', 'event', 'UI', 'enter', modeType );

        });
    }

    /*
     * If in mobile ios, site param is added to url when clicking on the map
     * the below code bypasses the splash screen
     */
    const isLinkFromiOS = parsedQueryString.site;
    if ( isLinkFromiOS && parsedQueryString.modeType === 'vr' ) {
        hideSplash();

        const overlay = document.createElement( 'div' );
        overlay.setAttribute( 'style', 'z-index:1000; background-color:#black; position: absolute; top:0px; left:0px; width:100%; height:100%;' );
        document.body.appendChild( overlay );
        overlay.addEventListener( 'click', () => {
            onEnterVR();
            overlay.parentNode.removeChild(overlay);
        });

    } else if ( isLinkFromiOS && parsedQueryString.modeType === '360' ) {
        hideSplash();
        onEnter360();
    }

    new ExitButton();
	return splash;
}
