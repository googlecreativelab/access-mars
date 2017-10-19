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


# Script for Cinema4D which pulls in a folder of terrain .obj files and sets proper
# metadata on each tile.
import os
import unicodedata
import c4d
from c4d import documents, storage, bitmaps

# Constants
colladaExportTagId = 1039717

# Relevant COLLADA Export tag ids
COLLADA_EXPORT_SETTINGS_CUSTOM_DATA = 1021

class TileTexInfo:

	def __init__( self, id, baseSize, xsmPrefix, smPrefix, hasMediumSize, hasLargeSize ):
		self.tileID = id
		self.baseSize = baseSize
		self.xsmPrefix = xsmPrefix
		self.smPrefix = smPrefix
		self.hasMediumSize = hasMediumSize
		self.hasLargeSize = hasLargeSize

	def toString( self ):
		result = 'TYPE TILE, ID ' + self.tileID + ', SIZE ' + str( self.baseSize ) + ', XSM ' + self.xsmPrefix + ', SM ' + self.smPrefix + ', MD '
			
		if self.hasMediumSize:
			result += '1'
		else:
			result += '0'

		result += ', LG '

		if self.hasLargeSize:
			result += '1'
		else:
			result += '0'

		return result

def main():

	c4d.StopAllThreads()

	tileTexInfoDict = {}

	# Get a path to load the tile meshes from
	directoryPath = c4d.storage.LoadDialog( title = 'Select terrain tile directory', flags = c4d.FILESELECT_DIRECTORY )
	decodedDirPath = directoryPath.decode( 'utf-8' )

	# Exit if the user cancels the load dialog
	if directoryPath is None:
		return

	# Get a list of all files in the selected directory
	dirList = [ os.path.normcase( f ) for f in os.listdir( decodedDirPath ) ]
	
	# Get a list of all .obj files in the selected directory
	objList = [ os.path.join( decodedDirPath, f ) for f in dirList 
		if os.path.splitext( f )[ 1 ] == '.obj' and isTileMesh( f ) ]

	# Exit of no obj files are found
	if len( objList ) is 0:
		return

	# Get a list of all _xsm prefixed .jpg files
	xsmallJPEGList = [ os.path.join( decodedDirPath, f ) for f in dirList 
		if os.path.splitext( f )[ 1 ] == '.jpg' and '_xsm' in os.path.splitext( f )[ 0 ] and isTileMesh( f ) ]

	# Get a list of all _sm prefixed .jpg files
	smallJPEGList = [ os.path.join( decodedDirPath, f ) for f in dirList 
		if os.path.splitext( f )[ 1 ] == '.jpg' and '_sm' in os.path.splitext( f )[ 0 ] and isTileMesh( f ) ]

	# Get a list of all unprefixed .jpg files
	baseJPEGList = [ os.path.join( decodedDirPath, f ) for f in dirList
		if os.path.splitext( f )[ 1 ] == '.jpg' and '_' not in os.path.splitext( f )[ 0 ] and isTileMesh( f ) ]

	# Get a list of all _lg prefixed .jpg files
	largeJPEGList = [ os.path.join( decodedDirPath, f ) for f in dirList 
		if os.path.splitext( f )[ 1 ] == '.jpg' and '_lg' in os.path.splitext( f )[ 0 ] and isTileMesh( f ) ]
	
	# Set up TileTexInfo objects
	for i in range( 0, len( baseJPEGList ) ):
		
		# Get xsmall jpg filename
		xsmFilename = xsmallJPEGList[ i ]
		xsmFilenameASCII = unicodeToASCII( xsmFilename )

		# Get small jpg filename
		smFilename = smallJPEGList[ i ]
		smFilenameASCII = unicodeToASCII( smFilename )

		# Get base jpg filename
		baseFilename = baseJPEGList[ i ]
		baseFilenameASCII = unicodeToASCII( baseFilename )
		
		# Get large jpg filename
		largeFilename = largeJPEGList[ i ]
		largeFilenameASCII = unicodeToASCII( largeFilename )

		# Get xsmall jpg dimensions
		xsmBitmap = c4d.bitmaps.BaseBitmap()
		xsmBitmap.InitWith( xsmFilenameASCII )
		xsmSize = xsmBitmap.GetSize()[ 0 ]

		# Get small jpg dimensions
		smBitmap = c4d.bitmaps.BaseBitmap()
		smBitmap.InitWith( smFilenameASCII )
		smSize = smBitmap.GetSize()[ 0 ]

		# Get base jpg dimensions
		baseBitmap = c4d.bitmaps.BaseBitmap()
		baseBitmap.InitWith( baseFilenameASCII )
		baseSize = baseBitmap.GetSize()[ 0 ]

		# Get large jpg dimensions
		largeBitmap = c4d.bitmaps.BaseBitmap()
		largeBitmap.InitWith( largeFilenameASCII )
		largeSize = largeBitmap.GetSize()[ 0 ]

		xsmPrefix = 'xsm'
		smPrefix = 'sm'
		hasMediumSize = True
		hasLargeSize = False

		# Swap xsm and sm sizes if sm is actually smaller than xsm
		if smSize < xsmSize:
			xsmPrefix = 'sm'
			smPrefix = 'xsm'

		if baseSize == smSize or baseSize == xsmSize:
			hasMediumSize = False

		if largeSize > baseSize:
			hasLargeSize = True

		basename = os.path.basename( baseFilename )
		tileID = os.path.splitext( basename )[ 0 ]
		tileTexInfoDict[ tileID ] = TileTexInfo( tileID, baseSize, xsmPrefix, smPrefix, hasMediumSize, hasLargeSize )

	# Merge all tile meshes
	for filename in objList:
		
		# Convert unicode filename to ASCII
		asciiFilename = unicodeToASCII( filename )
		
		# Get tile ID from the filename
		basename = os.path.basename( filename )
		tileID = os.path.splitext( basename )[ 0 ]

		if c4d.documents.MergeDocument( doc, asciiFilename, c4d.SCENEFILTER_OBJECTS | c4d.SCENEFILTER_MATERIALS | c4d.SCENEFILTER_MERGESCENE ) is True:
			newTile = doc.GetFirstObject()
			newTile.SetName ( tileID )

			newTag = newTile.MakeTag( colladaExportTagId )
			tagData = newTag.GetDataInstance()
			customData = tileTexInfoDict[ tileID ].toString()
			tagData.SetString( COLLADA_EXPORT_SETTINGS_CUSTOM_DATA, customData )


	# Get the background mesh path
	backgroundPath = os.path.join( decodedDirPath, 'background.obj' )
	backgroundPathASCII = unicodeToASCII( backgroundPath )

	# Merge the background mesh
	if c4d.documents.MergeDocument( doc, backgroundPathASCII, c4d.SCENEFILTER_OBJECTS | c4d.SCENEFILTER_MATERIALS | c4d.SCENEFILTER_MERGESCENE ) is True:
		newBackground = doc.GetFirstObject()
		newBackground.SetName( 'BACKGROUND' )

		backroundTag = newBackground.MakeTag( colladaExportTagId )
		tagData = backroundTag.GetDataInstance()
		tagData.SetString( COLLADA_EXPORT_SETTINGS_CUSTOM_DATA, 'TYPE BACKGROUND' )

	# Get the simple collision mesh path
	collisionPath = os.path.join( decodedDirPath, 'simple.obj' )
	collisionPathASCII = unicodeToASCII( collisionPath )

	# Merge the collision mesh
	if c4d.documents.MergeDocument( doc, collisionPathASCII, c4d.SCENEFILTER_OBJECTS | c4d.SCENEFILTER_MATERIALS | c4d.SCENEFILTER_MERGESCENE ) is True:
		newCollision = doc.GetFirstObject()
		newCollision.SetName( 'SIMPLE' )

		collisionTag = newCollision.MakeTag( colladaExportTagId )
		tagData = collisionTag.GetDataInstance()
		tagData.SetString( COLLADA_EXPORT_SETTINGS_CUSTOM_DATA, 'TYPE SIMPLE' )


def unicodeToASCII( str ):
	return unicodedata.normalize( 'NFKD', str ).encode( 'ascii', 'ignore' )

def isTileMesh( f ): 
	return os.path.splitext( f )[ 0 ] != 'simple' and os.path.splitext( f )[ 0 ] != 'background'

if __name__ == '__main__':
	main()