#!/bin/bash

cd assets/data/

while IFS=, read -r Number Theme Subtheme Year SetName Minifigs Pieces UKPrice USPrice CAPrice EAN UPC Notes QtyOwned NewValue UsedValue
do
    temp="${Number%\"}"
    Number="${temp#\"}"

    if [ "$Number" != "Number" ]; then
        if [ ! -f "$Number" ]; then
            echo "Downloading $Number"
            wget "https://brickset.com/exportscripts/inventory/$Number"
        fi
    fi
done < owned.csv

exit


while IFS=, read -r SetID Number Variant Theme Subtheme Year Name Minifigs Pieces UKPrice USPrice CAPrice EUPrice ImageURL OwnedBy WantedBy Owned Wanted QtyOwned Rating
do
    if [ "$SetID" != "SetID" ]; then
        if [ ! -f "$SetID-1" ]; then
            echo "Downloading $SetID"
            wget "https://brickset.com/exportscripts/inventory/$SetID-1"
        fi
    fi
done < allsets
