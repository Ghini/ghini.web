#!/bin/bash

# split a tile into the four tiles one zoom level deeper, respecting the
# naming convention tiles-{zoom}/{zoom}-{x}-{y}.png.  splitting one tile one
# zoom level deeper gives the tiles:
# tiles-{zoom+1}/{zoom+1}-{x*2,x*2+1}-{y*2,y*2+1}.png

for i in $@
do
    ZOOM=$(echo $i | sed -e 's|.*/\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\)\.png|\1|')
    X=$(echo $i | sed -e 's|.*\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\)\.png|\2|')
    Y=$(echo $i | sed -e 's|.*\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\)\.png|\3|')
    i1=./$(( $ZOOM +1 )).$(( $X * 2 )).$(( $Y * 2 )).png
    i2=./$(( $ZOOM +1 )).$(( $X * 2 + 1 )).$(( $Y * 2 )).png
    i3=./$(( $ZOOM +1 )).$(( $X * 2 )).$(( $Y * 2 + 1 )).png
    i4=./$(( $ZOOM +1 )).$(( $X * 2 + 1 )).$(( $Y * 2 + 1 )).png
    if [ -f $i ]
    then
        convert $i +repage -scale 512x512 -crop 256x256+0+0 $i1
        convert $i +repage -scale 512x512 -crop 256x256+256+0 $i2
        convert $i +repage -scale 512x512 -crop 256x256+0+256 $i3
        convert $i +repage -scale 512x512 -crop 256x256+256+256 $i4
    else
        echo $i1 $i2 $i3 $i4
    fi
done
