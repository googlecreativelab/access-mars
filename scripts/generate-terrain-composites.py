#!/usr/bin/env python
#  Copyright 2017 Google Inc.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#  http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

import os, sys
from shutil import copyfile

# example: 
# $ python generate-terrain-composites.py /Users/jeremyabel/Downloads/webvr_terrain_v0 marias_pass 30 8 2 1
# 									      ^^^^^^^^^                                    ^^^^^^^^^^^ ^^^^^^^^
# 									   Terrain source dir                              Terrain     Polycounts (in 1k increments)
# 									                                                   site name   of the 4 "layers"
# 									                                                               1st is 4 center tiles
# 									                                                               2nd is 12 tiles surrounding center tiles
# 									                                                               3rd is 20 tiles surrounding previous 12 tiles
# 									                                                               4th is 28 tiles surrounding previous 20 tiles

tileIDsByLayer = [
	[ '03333333', '12222222', '21111111', '30000000' ],
	[ '03333330', '03333331', '03333332', '12222220', '12222221', '12222223', '21111110', '21111112', '21111113', '30000001', '30000002', '30000003' ],
	[ '03333312', '03333313', '03333321', '03333322', '03333323', '12222202', '12222203', '12222212', '12222230', '12222232', '21111100', '21111101', '21111103', '21111130', '21111131', '30000010', '30000012', '30000020', '30000021', '30000030' ],
	[ '30000011', '30000013', '30000022', '30000023', '30000031', '30000032', '30000033', '12222200', '12222201', '12222210', '12222211', '12222213', '12222231', '12222233', '03333300', '03333301', '03333302', '03333303', '03333310', '03333311', '03333320', '21111102', '21111120', '21111121', '21111122', '21111123', '21111132', '21111133' ]
]

textureSuffixes = [ '_xsm', '_sm', '', '_lg' ]

dir = sys.argv[ 1 ]
site = sys.argv[ 2 ]
outDir = os.path.join( dir, 'COMPOSITES', site )
polycounts = [ sys.argv[ 3 ], sys.argv[ 4 ], sys.argv[ 5 ], sys.argv[ 6 ] ]
totalPolycount = 0

dirList = [ os.path.normcase( f ) for f in os.listdir( dir ) ]

# Create output directory if it doesn't exist
if not os.path.exists( outDir ):
    os.makedirs( outDir )

for i in range( 0, len( tileIDsByLayer ) ):
	tileIDs = tileIDsByLayer[ i ]
	polycount = int( polycounts[ i ] ) * 1000
	inDir = os.path.join( dir, site + '_' + str( polycount ) )

	for tileID in tileIDs:
		# Copy .obj
		objSrcPath = os.path.join( inDir, tileID + '.obj' )
		objDstPath = os.path.join( outDir, tileID + '.obj' )
		copyfile( objSrcPath, objDstPath )

		# Copy textures
		for textureSuffix in textureSuffixes:
			texSrcPath = os.path.join( inDir, tileID + textureSuffix + '.jpg' )
			texDstPath = os.path.join( outDir, tileID + textureSuffix + '.jpg' )
			copyfile( texSrcPath, texDstPath )

		totalPolycount += polycount

print 'total polycount: ' + str( totalPolycount )