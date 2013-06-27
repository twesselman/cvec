var express = require ('express');
var http = require('http');
var mongodb = require('mongodb');
var nodemailer = require("nodemailer");

var server = express.createServer();
server.configure(function() {
    server.use(express.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({secret: 'my not-so super secret'}));
    });

server.use(express.static(__dirname + '/website'));
server.use(express.static(__dirname + '/scripts'));

// listen
var port = process.env.PORT || 3000;
server.listen(port, function () {
    console.log('webstuff - listening on '+port);
});

var dbserver = new mongodb.Server('ds031618.mongolab.com', 31618);
var dbMongo = new mongodb.Db('heroku_app16429708', dbserver, {safe:false});

dbMongo.open(function on_open(err, dbMongo) {
    if (err) {
        console.log(err);
        throw(err);
    }
    console.log('Mongo db opened');
    dbMongo.authenticate('cvecuser', 'cvecpassword', function on_authenticated(err, result) {
        if (err) {
            console.log(err);
            throw(err);
        }
        console.log('db authenticated');
        server.doctors = new mongodb.Collection(dbMongo, 'doctors');
        server.patients = new mongodb.Collection(dbMongo, 'patients');
    });
});

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: "cvecproto@gmail.com",
        pass: "cvecproto1"
    }
});

server.post('/sendmail', function (req, res) {
    console.log('/sendmail');

    var mailOptions = {
        from: "CVEC Alert <cvecproto@gmail.com>", // from address
        to: req.body.toemail, // list of receivers, separate with commas
        subject: req.body.subject, // Subject line
        text: "text goes here", // plaintext body
        html: "<b>html version</b>" // html body
    };

    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        }else{
            console.log("Message sent: " + response.message);
        }
    });
        
    res.send('set ok');
});

server.post('/resetdb', function(req, res) {
    console.log('resetdb called');
    server.patients.remove();
    server.doctors.remove();
    
    server.doctors.insert({"doctor_id": "jwilson", "firstname": "James", "lastname": "Wilson", "email" : "james wilson email"});
    server.doctors.insert({"doctor_id": "lcuddy", "firstname": "Lisa", "lastname": "Cuddy", "email": "lisa cuddy email"});
    server.doctors.insert({"doctor_id": "rchase", "firstname": "Robert", "lastname": "Chase", "email" : "robert chase email"});
    server.doctors.insert({"doctor_id": "acameron", "firstname": "Allison", "lastname": "Cameron", "email": "allison cameron email"});
    server.doctors.insert({"doctor_id": "eforeman", "firstname": "Eric", "lastname": "Foreman", "email": "eric foreman email"});

    server.patients.insert({"patient_id": "radler", "firstname": "Rebecca", "lastname": "Adler",
        medications: [{"bottle_id": "38495", "doctor_id": "jwilson"}, 
                      {"bottle_id": "83343", "doctor_id": "acameron"}] });
    server.patients.insert({"patient_id": "mhartig", "firstname": "Maxine", "lastname": "Hartig",
        medications: [{"bottle_id": "13847", "doctor_id": "eforeman"}, 
                      {"bottle_id": "65737", "doctor_id": "lcuddy"}] });
                      
    res.send("DB Reset");
});

server.get('/getdoctors', function(req,res) {
    console.log("getdoctors called");
    
    GetDoctor("radler","83343", function(err, doctor_id) {
        if (err) return;
        
        server.doctors.findOne({"doctor_id":doctor_id}, function(err, doc) {
            if (doc) {
                console.log(doc.firstname + " " + doc.lastname + " email:"+ doc.email);
            } else {
                console.log('no doc');
            }
        });        
    });

});

var GetDoctor = function(patient_id, bottle_id, cb) {
    // change patent and bottle id to what's passed in
    server.patients.findOne(
        {"patient_id":patient_id, 
        medications:{ 
            $elemMatch: {"bottle_id":bottle_id} 
        } 
    }, function(err, patient) {
        if (err) return cb(err); 
        if (!patient) return cb("no patient found");
         
        console.log("Matches patient:" + patient.firstname);
        
        patient.medications.forEach(function(item, index) {
           if (item.bottle_id == bottle_id) {
                console.log("Matches doctor:" + item.doctor_id);
                server.doctors.findOne({"doctor_id":item.doctor_id}, function(err, doctor) {
                    if (doctor) {
                        return cb(null, doctor, patient)
                    } else {
                        console.log('no doctor');
                    }
                });        
            }
        });
    });
};

server.post('/alert', function (req, res) {
    console.log('/alert');
    console.log(req.body);

    GetDoctor(req.body.patient_id,req.body.bottle_id, function(err, doctor, patient) {
        if (err) return;
        if (!doctor) {console.log("doctor not found"); return;}

        var mailText = "Dr "+ doctor.lastname + "," + "<br/><br/> please call " + patient.firstname + " " + patient.lastname;
        
        var to_email = req.body.to_email;
        if (!to_email) to_email = doctor.email;
        var mailOptions = {
            from: "CVEC Alert <cvecproto@gmail.com>", // from address
            to: to_email, // list of receivers, separate with commas
            subject: "Alert: " + req.body.reason_code, // Subject line
            text: "plaintext version", // plaintext body
            html: mailText // html body
        };
    
        // send mail with defined transport object
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log(error);
            } else {
                console.log("Message sent: " + response.message);
            }
        });
    });

    //  reason_code: 'gagsagsag' }
    res.redirect("/");
});


