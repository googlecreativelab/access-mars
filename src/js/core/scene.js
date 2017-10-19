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
 * Scene
 *
 * Singleton scene management class. Controls loading,
 * display, and transitions between scene terrain sites.
 *
 * Also serves as a distributor for general scene state info,
 * like whether or not interactions are allowed or if a modal
 * card is showing.
 *
 * The app starts here: index.js calls init() and loadSite()
 * to load the requested terrain site.
 */

const TELEPORT_HOLD_THRESHOLD = 0.5;
const TELEPORT_DELTASQUARED_THRESHOLD = 1.0;

import { EventEmitter } from 'eventemitter3';
import { TileManager } from './tile-manager';
import { AudioManager } from './audio-manager';
import { PlatformUtils } from '../utils/platform-utils';

export const GridSize = 4;

class StaticScene extends EventEmitter {

	constructor() {
		super();
		this.rootDirectory = null;
		this.baseFilename = null;
		this.enableTeleport = false;
		this.isShowingInfoCard = false;
		this.nextSite = 'landing_site';
		this.firstLoad = true;
		this.hasSeenIntro = false;
		this.hasSeenOrientation = false;
		this.firstVOPlayed = false;
		this.isPageRefresh = false;
		this.wireframe = false;
		this.iOSSafari = false;
		this.controllerType = 'mouse-touch'; // options are ['mouse-touch', 'controller']
		this.modeType = '360'; // options are ['360', 'vr']
	}

	init( flags ) {

		this.flags = flags;
		// console.log( 'flags', this.flags );
		this.playerStartPos = new THREE.Vector3( 4.25, 0.00, 4.39 );
		this.playerStartRot = new THREE.Vector3( 0.34, 55.4, 0.00 );

		this.orientationCard = document.getElementById( 'orientation-card' );
		this.infoCard = document.getElementById( 'info-card' );
		this.mapCard = document.getElementById( 'map-card' );
		this.mapMarkers = document.getElementById( 'horizMarkers' );
		this.markers = document.getElementById( 'markers' );
		this.player = document.getElementById( 'player' );
		this.camera = document.getElementById( 'camera' );
		this.fader = document.getElementById( 'fader' );
		this.scene = document.getElementById( 'scene' );
		this.sky = document.getElementById( 'sky' );
		this.controllerRay = document.getElementById( 'controller-ray' );
		this.controllerDot = document.getElementById( 'controller-dot' );
		this.controllerArc = document.getElementById( 'controller-arc' );
		this.roverMarkers = document.getElementById( 'rover-markers' );
		this.terrainContainer = document.getElementById( 'terrain-container' );

		// flags
		AudioManager.disableAudio = !!this.flags.disableAudio;
		AudioManager.disableVO = !!this.flags.disableVO || AudioManager.disableAudio;
		AudioManager.disableSFX = !!this.flags.disableSFX || AudioManager.disableAudio;
		AudioManager.disableAtmosphere = !!this.flags.disableAtmosphere || AudioManager.disableAudio;
		AudioManager.disableIntroVO = !!this.flags.disableIntroVO || AudioManager.disableAudio;
		this.wireframe = !!this.flags.wireframe || this.wireframe;
		this.nextSite = this.flags.site || this.nextSite;
		this.hasSeenOrientation = !!this.flags.hasSeenOrientation || this.hasSeenOrientation;
		this.isLinkFromiOS = !!this.flags.site;

		// The site flag is used for page refreshes on ios
		if ( this.isLinkFromiOS ) {

				this.firstVOPlayed = true;
				this.hasSeenIntro = true;
				this.isPageRefresh = true;

				// TODO: remove this check after debugging
				if ( PlatformUtils.isMobile() ) {
					this.hasSeenOrientation = true;
				}

			// Remove the elements associated with the intro video, since it won't be played
			[ 'skip-intro', 'intro-video-webm', 'intro-video-mp4' ].forEach( id => {
				const el = document.getElementById( id );
				el.parentNode.removeChild( el );
			});
		}

		// Teleport the user if the hand controller button has been
		// held down and released.
		this.teleportCoolDownActive = false;
		this.scene.addEventListener( 'terrain-cursor-up', event => {

			if( this.teleportCoolDownActive ) return;
			this.teleportCoolDownActive = true;
			setTimeout( () => {
				this.teleportCoolDownActive = false;
			}, 200);

			// If press and release is close to each other. Only used for non-controllers.
			const isCloseEnough = this.controllerType === 'mouse-touch' &&
								event.detail.deltaSquared < TELEPORT_DELTASQUARED_THRESHOLD;

			const isHandHeldController = this.controllerType === 'controller';

			if ( isCloseEnough || isHandHeldController ) {
				this.teleportToPoint( event.detail.point );
			}

		});

		// Play a sound when opening a modal window
		this.scene.addEventListener( 'stateadded', event => {
			if ( event.target !== this.scene ) return;
			if ( event.detail.state !== 'modal' ) return;
			AudioManager.playSFX( 'ui-click' );
		});

		// Play a sound when closing a modal window
		this.scene.addEventListener( 'stateremoved', event => {
			if ( event.target !== this.scene ) return;
			if ( event.detail.state !== 'modal' ) return;
			AudioManager.playSFX( 'ui-close' );
		});

		// Hide the modal cards when they are clicked
		this.scene.addEventListener( 'modal-up', event => {
			if ( !this.scene.is( 'modal' ) ) return;
			this.infoCard.removeState( 'visible' );
			this.mapCard.removeState( 'visible' );
		});

		// Hide the map and load a new scene when the map is clicked
		this.scene.addEventListener( 'on-map-clicked', event => {
			this.mapCard.removeState( 'visible' );
			this.onClickScene( event.detail );
		});

		// Set info card state flag
		this.infoCard.addEventListener( 'stateadded', event => {
			if ( event.detail === 'visible' ) this.isShowingInfoCard = true;
		});

		// Clear info card state flag
		this.infoCard.addEventListener( 'stateremoved', event => {
			if ( event.detail === 'visible' ) this.isShowingInfoCard = false;
		});

	}

	// set mode type
	setModeType( modeType ) {
		this.modeType = modeType;
	}

	// set mode type
	setControllerType( clientType, info ) {
		this.controllerType = clientType;
	}

	/**
	 * You can only have 1 controller at a time
	 * Controller is added after enter-vr event
	 * Controllers are based on getControllerType's info param
	 */
	tryAddingController( info ) {

		const controllers = [
			{ label: 'GearVR', 		attribute: 'gearvr-controls' 		},
			{ label: 'Daydream',	attribute: 'daydream-controller' 	},
			{ label: 'Oculus',		attribute: 'oculus-touch-controls' 	},
			{ label: 'Vive', 		attribute: 'vive-controls' 			},
			{ label: 'OpenVR', 		attribute: 'vive-controls' 			}
		];

		const righthandEl = document.getElementById( 'right-hand' );
		controllers.forEach( controller => {
			if ( info.indexOf( controller.label ) >= 0 ) {
				righthandEl.setAttribute( controller.attribute, 'hand', 'right' );
			}
		});

		// checks visibility of controls
		this.emit( 'on-controls-ready' );

	}

	onClickScene( siteName ) {

		// stops all voiceovers before moving to the next scene
		AudioManager.stopVO();

		// Hide the controller entities
		this.controllerRay.setAttribute( 'visible', false );
		this.controllerDot.setAttribute( 'visible', false );
		this.controllerArc.setAttribute( 'visible', false );

		// On mobile safari (iOS 10 specifically), the experience can crash after jumping to a different
		// scene due to memory issues. A page refresh is used instead on this platform, which frees up
		// memory to load a new site smoothly.
		if ( PlatformUtils.isIOSSafari() ) {

			// Get any existing url params and passes them back to url before page refresh
			var urlArray = window.location.href.split( '?' );
			var url = urlArray[ 0 ];
			var params = urlArray[ 1 ];
			var paramString = '';
			if ( params ) {
				const paramList = [ 'disableAudio', 'disableVO', 'disableSFX', 'disableAtmosphere', 'disableIntroVO' ];
				paramList.forEach( param => {
					if( params.indexOf( param ) > -1 ) paramString += ( '&' + param + '=true' );
				});
			}

			paramString += ( '&modeType=' + this.modeType );
			window.location.href = url + '?site=' + siteName + paramString;

		} else {
			// Load the next site and fade to black
			this.nextSite = siteName;
			this.fader.addState( 'visible' );
		}
	}

	loadSite( site ) {
		if ( site === this.currentSite ) return;

		// console.log( 'scene', 'loadSite', site );

		this.emit( 'site-changed', site );

		// Get terrain folder info
		this.currentSite = site;
		this.baseFilename = site;
		this.rootDirectory = 'terrain/' + this.baseFilename + '/';
		this.terrainDirectory = this.rootDirectory + '/' + this.baseFilename;

		ga( 'send', 'event', 'site', 'loaded', this.currentSite );

		// Get site POI and horizon markers for the current site
		this.poiMarkers = document.getElementById( this.currentSite + '_markers' );
		this.horizMarkers = document.getElementById( this.currentSite + '_horizMarkers' );

		// Only show rover markers in the landing site
		this.roverMarkers.setAttribute( 'visible', site === 'landing_site' );

		this.scene.object3D.background = new THREE.Color( '#000' );

		// Special handling for the landing site to accommodate the intro sequence
		if ( site === 'landing_site' && !this.hasSeenIntro ) {
			this.hideElements();

			// Adjust the player position so they can see the intro
			this.player.setAttribute( 'position', new THREE.Vector3( 5.00, 0.00, 5.00 ) );
			this.player.setAttribute( 'rotation', new THREE.Vector3( 0.00, 0.00, 0.00 ) );

			// Prepare the intro
			this.scene.setAttribute( 'intro-player', '' );

			// Show the scene once the intro video is complete
			this.scene.addEventListener( 'video-complete', event => {
				this.onDisplayReady();
				this.terrain.addState( 'visible' );
				this.terrain.addState( 'show-simple' );
				this.terrain.setAttribute( 'visible', true );
				this.player.setAttribute( 'position', this.playerStartPos );
				this.player.setAttribute( 'rotation', this.playerStartRot );
			});

			// Enable interaction and play intro VO after the intro is done
			this.scene.addEventListener( 'intro-complete', event => {

				// Set a flag to skip the intro if the user returns to the landing site during
				// the current session.
				this.hasSeenIntro = true;
				this.tryEnablingInteraction();
				this.tryPlayingAudio();

				if ( this.firstLoad ) {
					this.showMarkers();
					this.firstLoad = false;
				}
			});

		// Loading of Landing Site
		} else if ( site === 'landing_site' && this.hasSeenIntro ) {
			this.onDisplayReady();
			this.player.setAttribute( 'position', this.playerStartPos );
			this.player.setAttribute( 'rotation', this.playerStartRot );

			this.createRover();
			this.tryEnablingInteraction();
			this.tryPlayingAudio();

		// Loading of sites: Pahrump Hills, Murray Buttes and Marias Pass
		} else {
			// Set a flag to skip the intro if the user returns to the landing site during
			// the current session.
			this.hasSeenIntro = true;

			// Reset player position to origin
			this.player.setAttribute( 'position', '0 0 0' );
			this.player.setAttribute( 'rotation', '0 0 0' );

			// Remove the intro video, it's not used on the other terrain sites.
			if (this.scene.components[ 'intro-player' ]) {
				this.scene.removeAttribute( 'intro-player' );
			}
		}

		// Create a new terrain entity
		this.terrain = document.createElement( 'a-entity' );
		this.terrain.setAttribute( 'terrain', '' );
		this.terrain.id = 'terrain_' + site;

		// Wait for the terrain element to be fully loaded as far as AFRAME is
		// concerned. Until then, it's not safe to touch the terrain component.
		this.terrain.addEventListener( 'loaded', event => {
			this.terrain.components[ 'terrain' ].loadTerrain().then( tiles => {
				this.tileManager = new TileManager( tiles );
			}).then( () => {
				return new Promise( resolve => {

					// If the intro is playing, then onDisplayReady is called later
					// by the video-complete event which is defined above.
					if ( !this.scene.is( 'playing-intro' ) ) {
						this.onDisplayReady();
					}

					this.scene.addState( 'loaded' );

					// Let others know the scene is displayed
					this.emit( 'terrain-loaded' );
					this.emit( 'site-loaded' );

					// Enable interaction, audio, and rover display
					this.tryEnablingInteraction();
					this.tryPlayingAudio();
					this.tryShowRover();

					resolve();
				});
			});
		});

		// Add the terrain to the scene
		this.terrainContainer.appendChild( this.terrain );
	}

	/**
	 * Enable interaction flags if loading and the intro are done
	 */
	tryEnablingInteraction() {

		if ( !this.scene.is( 'loaded' ) ) return;
		if ( this.scene.is( 'playing-intro' ) ) return;

		// Play the tile loading sound
		if ( !this.isLinkFromiOS ) {
			AudioManager.playSFX( 'tile-loadD' );
		}

		// Show orientation card if the user hasn't seen it yet
		if ( !this.hasSeenOrientation ) {
			this.hasSeenOrientation = true;
			this.orientationCard.addState( 'visible' );
			this.orientationCard.components[ 'orientation-card' ].update();
		}

		// Hide the simplified terrain and show the full terrain
		this.terrain.removeState( 'show-simple' );
		this.terrain.addState( 'show-terrain' );
		this.terrain.addState( 'visible' );
		this.terrain.setAttribute( 'visible', true );

		// Display POI and Horizon markers
		if ( this.poiMarkers ) this.poiMarkers.setAttribute( 'visible', true );
		if ( this.horizMarkers ) this.horizMarkers.setAttribute( 'visible', true );

		this.scene.addState( 'intro-complete' );
		this.scene.emit( 'initial-load-complete' );
		this.emit( 'initial-load-complete' );

		this.scene.addState( 'interactive' );

		this.showMarkers();
		this.enableTeleport = true;

		// checks visibility of controls
		this.emit( 'on-controls-ready' );

	}

	tryPlayingAudio() {

		if ( !this.scene.is( 'loaded' ) ) return;
		if ( this.scene.is( 'playing-intro' ) ) return;

		// Manny: is this required? It's a weird place for it since this function is about playing audio.
		// This is related to ios Mobile Page refresh. I didn't have time to move it last night.
		if ( this.isLinkFromiOS ) {
			this.tryEnablingInteraction();
			return;
		}

		// If any of the audio is disabled thru any of the debug flags, _onEnded won't
		// exist and these calls will error out, so those errors are caught here.
		try {
			if ( this.firstVOPlayed ) return;
			this.firstVOPlayed = true;

			AudioManager.playVO( 'intro1', 0.5 )._onEnded = () => {
				AudioManager.playVO( 'intro2', 0.25 );
			};
		} catch( error ) {
			this.firstVOPlayed = true;
		}
	}

	onDisplayReady() {
		if ( !AudioManager.disableAtmosphere ) {
			AudioManager.playAtmosphere();
		}

		// Disable interaction when the fade-out begins
		this.fader.addEventListener( 'transition-in-begin', event => {
			this.scene.removeState( 'interactive' );
		});

		// Load the next site when the fade-out is finished
		this.fader.addEventListener( 'transition-in-complete', event => {
			this.unload();
			this.loadSite( this.nextSite );
			this.sky.removeState( 'visible' );
		});

		// Trigger fade-in
		this.fader.removeState( 'visible' );
	}

	/**
	 * Unloads all terrain tiles, textures, colliders, and disables all site-specific markers. Used
	 * during site transitions.
	 */
	unload() {
		if ( !this.tileManager ) return;
		if ( !this.terrain ) return;

		this.tileManager.unload();
		this.tileManager = null;

		this.hideRover();

		this.terrain.parentNode.removeChild( this.terrain );
		this.terrain = null;

		this.scene.removeState( 'interactive' );
		this.scene.removeState( 'loaded' );
		this.enableTeleport = false;

		if ( this.poiMarkers ) this.poiMarkers.setAttribute( 'visible', false );
		if ( this.horizMarkers) this.horizMarkers.setAttribute( 'visible', false );
	}

	/**
	 * Teleports the user to a given point, typically
	 * provided by the cursor raycaster. Progressive
	 * terrain tile loading is resorted by distance
	 * to the user.
	 */
	teleportToPoint( point ) {
		if ( !this.enableTeleport ) return;
		if ( this.scene.is( 'modal' ) ) return;
		if ( this.isShowingInfoCard ) return;

		// Set the player position to the cursor position
		this.player.setAttribute( 'position', point );
		ga( 'send', 'event', 'position', 'teleport', this.currentSite + '/' + point.x.toFixed(5)+ ' ' + point.y.toFixed(5) + ' ' + point.z.toFixed(5) );

		// Play teleport sound
		AudioManager.playSFX( 'teleportG' );

		// Sort tile update order by proximity to the player.
		// Closer tiles get updated first.
		this.tileManager.updatePlayerPosition( point );

	}

	createRover() {
		if ( this.rover ) return this.rover;

		this.rover = document.createElement( 'a-entity' );
		this.rover.setAttribute( 'rover', '' );
		this.rover.setAttribute( 'rotation', { x: 0, y: 90, z: 0 } );
		this.rover.id = 'rover';

		this.terrainContainer.appendChild( this.rover );

		return this.rover;
	}

	tryShowRover() {
		if( !this.rover ) return;
		if( !this.isPageRefresh && !this.hasSeenIntro ) return;

		// The rover should only be visible on the landing site. Since this function
		// is only called when returning to the landing site after having seen the intro,
		// set the rover's complete state so that it shows up already in position.
		if ( this.currentSite === 'landing_site' ) {
			this.rover.setAttribute( 'visible', true );
			this.rover.addState( 'complete' );
		} else {
			this.hideRover();
		}
	}

	hideRover() {
		if ( !this.rover ) return;
		this.rover.setAttribute( 'visible', false );
	}

	showMarkers() {
		this.mapMarkers.setAttribute( 'visible', true );
		this.markers.setAttribute( 'visible', true );
	}

	hideElements() {
		if ( this.terrain ) this.terrain.setAttribute( 'visible', false );
		this.mapMarkers.setAttribute( 'visible', false );
		this.markers.setAttribute( 'visible', false );
	}
}

export let Scene = new StaticScene();
