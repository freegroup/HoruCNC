# configure kivy
export CC=clang
export CXX=clang
export FFLAGS='-ff2c'
export USE_SDL2=1

# get the dependencies
export PLATYPUS=5.3

curl -O -L "http://www.sveinbjorn.org/files/software/platypus/platypus$PLATYPUS.zip"

unzip platypus$PLATYPUS.zip
gunzip Platypus.app/Contents/Resources/platypus_clt.gz
gunzip Platypus.app/Contents/Resources/ScriptExec.gz
mkdir -p /usr/local/bin
mkdir -p /usr/local/share/platypus
cp Platypus.app/Contents/Resources/platypus_clt /usr/local/bin/platypus
cp Platypus.app/Contents/Resources/ScriptExec /usr/local/share/platypus/ScriptExec
cp -a Platypus.app/Contents/Resources/MainMenu.nib /usr/local/share/platypus/MainMenu.nib
chmod -R 755 /usr/local/share/platypus

# create app
git clone https://github.com/kivy/kivy-sdk-packager.git
cd kivy-sdk-packager/osx

./create-osx-bundle.sh -k master -n HoruCNC -v "0.1.1" -a "Name" -o \
    "de.freegroup.horucnc" -i "../../HoruCNC/resources/HoruCNC.iconset/icon_256x256.png" -g 0

pushd build/MyApp.app/Contents/Resources/venv/bin
source activate
popd

python -m pip install --upgrade pyobjus plyer ...
python -m pip install ../../../myapp/

# reduce app size
./cleanup-app.sh MyApp.app

# the link needs to be created relative to the yourapp path, so go to that directory
pushd build/MyApp.app/Contents/Resources/
ln -s ./venv/bin/myapp yourapp
popd

./relocate.sh build/MyApp.app
./create-osx-dmg.sh build/MyApp.app MyApp