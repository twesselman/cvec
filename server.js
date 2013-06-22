var express = require ('express');
var server = express.createServer();
var http = require('http');

server.configure(function() {
    server.use(express.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({secret: 'my super secret'}));
    });

server.use(express.static(__dirname + '/website'));
server.use(express.static(__dirname + '/scripts'));

server.post('/set', function (req, res) {
    console.log('/set');
    req.session.username = req.body.name;
    res.send('set ok');
});

server.get('/read', function(req, res) {
   if(req.session.username)
   {
       res.send(req.session.username);
   }
   else
   {
       res.send('no data');
   }  
});

server.get('/test', function(req, res)
{
        var options = {
          host: '10.81.108.13',
          path: '',
          port: 3000,
          method: 'GET'
        };

        var callback = function(response) {
            console.log('callback');
          var str = '';
        
          //another chunk of data has been recieved, so append it to `str`
          response.on('data', function (chunk) {
            str += chunk;
          });
        
          //the whole response has been recieved, so we just print it out here
          response.on('end', function () {
                console.log(str);
                res.send(str);
          });
        };
        
        console.log('getting  from: '+options.host + '  path:' + options.path);
        
        http.request(options, callback).end();    
});

// listen
var port = process.env.PORT || 3000;
server.listen(port, function () {
    console.log('webstuff - listening on '+port);
});

