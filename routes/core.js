const express = require('express');
const router = express.Router();

// uploading
const multer = require('multer');
const fs = require('fs');
const mkdirp = require('mkdirp');

const Space = require('../models/spaceModel');
const Setting = require('../models/settingModel');
const Schema = require('../models/schemaModel');

const NamespaceController = require('../controllers/namespace.controller');
const EndpointController = require('../controllers/endpoint.controller');
const SpaceController = EndpointController.space;
const RainController = EndpointController.rain;
const DropController = EndpointController.drops;
const EndpointService = require('../services/endpoint.service');
const postEndpoint = EndpointService.post;
const getEndpoint = EndpointService.get;

router
    .get('/status/', (req, res) => {
        SpaceController.status(req.query, status => {
            res.status(200).send(status);
        });
    })
    .get('/spaces', (req, res) => {
        SpaceController.getAll(req.query, spaces => {
            res.status(200).send(spaces);
        });
    })
    .get('/space/:space', (req, res) => {
        // TODO: move this to the spaceController
        Space.findByName(req.params.space, (err, data) => res.json(data[0]));
    })
    
    .post('/endpoint/space', (req, res) => {
    // SPACES: ENDPOINTS TO FETCH DATA FROM SPACES (TWITTER, INSTAGRAM, ETC)
        let data = req.body.data;
        // TODO: add a way to return the last drop added, for reports
        NamespaceController.runCall(data, (resp, lastDropAdded, countAdded) => res.json(resp));
    })
    .delete('/space/:space', (req, res) => {
        // TODO: move this to the spaceController
        Space.removeSpace(req.params.space, () => res.status(200).send({ message: `${req.params.space} was deleted` }));
    })
    .get('/get/schemas', (req, res) => {

        const data = {
            spaces: !!req.query.spaces ? req.query.spaces: null,
            type: req.query.type,
            mode: 'count',
            action: 'schema.getAll'
        };
        
        getEndpoint(data, (resp) => {   
            res.status(200).send(resp);
        });

    })
    .delete('/schema/:space/:type', (req, res) => {
        // TODO: move this to the schemaController
        Schema.removeSchema(req.params.space, req.params.type, function () {
            res.status(200).send({ message: `${req.params.space} schema was deleted for ${req.params.space}` });
        });
    })
    .get('/get/rain', (req, res) => {
        RainController.getAll(req.query, rain => {
            res.status(200).send(rain);
        });
    })
    .get('/get/story', (req, res) => {
        DropController.writeStory(req.query, story => {
            res.status(200).send(story);
        });
    });

// SPACES: ENDPOINTS TO GET DATA FROM DATAWHORE API
router
    .get('/get/:endpoint/:space', (req, res) => {

        const data = {
            space: req.params.space,
            type: req.query.type ? req.query.type : req.params.endpoint,
            action: `${req.params.endpoint}.get`,
            query: req.query
        };
        
        getEndpoint(data, (resp) => {
            res.status(200).send(resp);
        });

    })
    .put('/update/:endpoint/:space', (req, res) => {

        const data = {
            space: req.params.space,
            type: req.body.type ? req.body.type : req.params.endpoint,
            action: req.body.action ? req.body.action : `${req.params.endpoint}.write`
        };

        postEndpoint(data, req.body.data, (resp) => {
            res.json(resp);
        })
    })
    .delete('/delete/:endpoint/:space', (req, res) => {
        // FIXME: DO NOT USE, deletes all the drops in the space! 😕
        const data = {
            space: req.params.space,
            type: req.params.endpoint,
            action: `${req.params.endpoint}.delete`
        };

        const dropIds = req.body;
        
        postEndpoint(data, dropIds, (resp) => {
            res.json(resp);
        })
    });



// UPLOADS
// TODO: change this to a put request
// FIXME: uploading to the wrong place!!!
router.post('/upload/:space/:folder/:filename', (req, res) => {

    // multer settings
    const storage = multer.diskStorage({
        destination: (_req, file, cb) => {
            const folderName = 'http://datawhore.erratik.ca:10010/public/uploads/' + _req.params.space + '/' + _req.params.folder;
            mkdirp(folderName, function (err) {
                cb(null, folderName);
            });
        },
        filename: (_req, file, cb) => {
            cb(null, _req.params.space + '-' + _req.params.filename + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1]);
        }
    });
    const upload = multer({ storage: storage }).single('file');

    upload(req, res, function (err) {

        if (err) {
            res.json({ error_code: 1, err_desc: err });
            return;
        }
        console.log(req.file);
        // todo: return base64 string for the icon
        Space.updateSpace(
            req.params.space,
            { icon: req.file.path, modified: Date.now() },
            (space) => res.json(space));

        // res.json(req.file);
    });
});

module.exports = router;
