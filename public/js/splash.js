// Copyright 2017 Google Inc.
//
//   Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
// limitations under the License.

document.addEventListener( 'DOMContentLoaded', () => {

	var about = document.querySelector( '.about' );
	var aboutBtn = document.querySelector( '.about-btn' );
	var closeBtn = document.querySelector( '.close' );

	aboutBtn.addEventListener( 'click', () => {
		ga( 'send', 'event', 'SplashPage', 'clicked', 'about' );
		about.style.display = 'block';
		about.scrollTop = 0;
	});

	closeBtn.addEventListener( 'click', () => {
		ga( 'send', 'event', 'SplashPage', 'clicked', 'close' );
		about.style.display = 'none';
	});

});
