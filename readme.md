***IN PROGRESS***


a mixmap layer for rendering open street map data from peermaps.


# installation

in your terminal, run `npm install` after you've cloned the repo.

# example

first, open the terminal and navigate to the directory where you've cloned your
repo. go to the
`example` directory. once there, run `tar -xzvf geodata.tar.gz`. after that, the
`example` directory should have a file called `points.json` and `lines.json`.

then, do `npm run example`. if everything worked correctly, you
should get some output that includes the url. you should have a line like this:

`[0005] info  Server running at http://192.168.129.37:9966/ (connect)`

if you navigate to that url in your browser and click in the website window, you
should eventually see a map. (for now, you have to click in the window -
this will be fixed.)
