#!/bin/bash

str="["

while IFS=, read -r Number Theme Subtheme Year SetName Minifigs Pieces UKPrice USPrice CAPrice EAN UPC Notes QtyOwned NewValue UsedValue
do
    str=$str$Number","
done < owned.csv

echo $str"]"
