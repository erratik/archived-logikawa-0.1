const _ = require('lodash');
const Utils = require('./lib/utils');
const pluck = require('./lib/utils').pluck;
const URLtoObject = require('./lib/utils').URLtoObject;
const schedule = require('node-schedule');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const Space = require('./models/spaceModel');
const Schema = require('./models/schemaModel');
const Drop = require('./models/dropModel');
const NamespaceController = require('./controllers/namespace.controller');
const FetchingService = require('./services/fetch-params.service');
const objectPath = require('object-path');

let namespaces = [];
let dropCountLastRun = 0;
let pastDropRuntimes = 0;
let dropsToFetch;


module.exports = function (app, spaces, settings, schemaGroups) {

    console.log(``);
    console.log('🔄 👄 👄 👄 ----------- CUM DUMPTRUCK RUNNING ------------- 👄 👄 👄');
    console.log(``);

    let startTime = new Date(Date.now() + 5000);
    let endTime = new Date(Date.now() + 60000 * 5);;

    let schemas = {};

    namespaces = spaces.map(space => {
        schemas[space.name] = [];
        return space.name
    });

    schemaGroups = schemaGroups.map(s => s.schemas.filter(o => {
        if (!!o.type && o.type.includes('rain')) {
            schemas[s.space].push(o);
            return o;
        }
    }));

    let allOpts;
    const fetchDrops = (isFetchingPast = true) => {

        dropsToFetch = 1;
        const namespaceOptions = namespaces.map(namespace => {


            const types = _.uniq(_.map(schemas[namespace], 'type'));

            const dataByTypes = types.map(rainType => {

                const schema = _.filter(schemas[namespace], {
                    type: rainType
                })[0];

                if (!schema || !schema.dropUrl) {
                    console.log(`🔄 [!] no drop url set for ${rainType} on ${namespace} `);
                    endTime = Date.now();

                } else {
                    const data = {
                        action: 'drops.fetch',
                        apiEndpointUrl: schema.dropUrl,
                        contentPath: schema.contentPath,
                        type: rainType,
                        space: namespace,
                        isFetchingPast: isFetchingPast
                    }

                    return data;
                }
            });


            return types.map((t, i) => {
                // console.log(_.filter(dataByTypes, {type: t}));
                // console.log(t, i, _.filter(dataByTypes, {type: t}));
                const isLastType = i === types.length - 1;

                const thisDataFetch = _.filter(dataByTypes, { type: t })[0];
                const nextDataFetch = isLastType ? null : _.filter(dataByTypes, { type: types[i + 1] })[0];
                // if (!i) {
                //     initFetch(thisDataFetch, nextDataFetch);
                // }
                return [thisDataFetch, nextDataFetch];
            });

            // prepareFetchOptions(thisDataFetch, nextDataFetch);

        });

        allOpts = JSON.parse(JSON.stringify(_.flattenDeep(namespaceOptions).filter(n => n)));
        initFetch(allOpts[0], 0);
    };


    const initFetch = (options, index) => {

        // console.log('allOpts', allOpts);
        options = allOpts[index];
        Drop.getSpaceDrops(options, (drops) => {
            const urlParams = FetchingService.composeParams(options, drops);
            // if (options.isFetchingPast) {
            //     console.log('🔄 [initFetch] FETCHING PAST');
            // } else {
            //     console.log('🔄 [initFetch] FETCHING FUTURE');
            // }
            console.log(` `);
            console.log('🔄 💦 [initFetch -> getSpaceDrops]', options.space, options.type, urlParams);
            options.urlParams = urlParams;

            NamespaceController.runCall(options, (resp, lastDropAdded, countAdded) => {
                // if (options.space === 'moves' && options.type === 'rain.storyline') {
                //     debugger;
                // }
                
                // TODO: how many drops were added is resp
                let dropCount = !!resp ? resp.length : 0;
                dropCountLastRun += dropCount;

                messageTotal(dropCount, options.space);
                if (index + 1 === allOpts.length) {

                    // TODO: send real total..
                    console.log('🔄 💦 total drops added: ' + dropCountLastRun);
                    console.log('🔄 💤  CUM DUMPTRUCK DONE @ 📅 ' + new Date());

                    // if (dropCountLastRun <= dropCountLastRun - dropCount) {

                    //     console.log(` `);
                    //     console.log('🔄 💀 💀 💀 -------------->  KILLED CUM DUMPTRUCK @ 📅 ' + new Date());
                    //     console.log(` `);
                    //     shiftDrops.cancel();
                    //     return;
                    // }

                } else {
                    ++index;
                    // console.log('nextOptionSet', allOpts[index]);
                    dropCallback(options, dropCount, index);
                }


            });
        });

    };


    const dropCallback = (options, dropCount, index) => {

        // console.log(`🔄 [namespace service] fetching for ${options.type} on ${options.space}`);

        if (options.isFetchingPast) {

            if (pastDropRuntimes === dropsToFetch) {
                pastDropRuntimes = 0;

            } else {

                pastDropRuntimes++;
                console.log(``);
            }

        }


        const nextOptionSet = allOpts[index];
        // console.log('nextOptionSet', nextOptionSet);
        if (!!nextOptionSet) {
            console.log(`🔄 --------------------------------------------------------------------------------------------`);
            // console.log(`🔄 [namespace service] running ${nextOptionSet.type} on ${nextOptionSet.space} next (${index})`);

            initFetch(nextOptionSet, index);
        }

    }

    const shiftDrops = schedule.scheduleJob('* */1 * * *', function () {
        // fetchDrops();
        // console.log(`🔄  📅 💧 getting older drops`);
        // console.log(` `);
    });

    const unshiftDrops = schedule.scheduleJob('*/10 * * * *', function () {
        fetchDrops(false);
        console.log(`🔄 🔥 adding new  drops! `);
        console.log(` `);

    });
    fetchDrops(false);




    function messageTotal(dropCount, space, total) {

        console.log(`🔄 | ${space} | 💧 drops added: ${dropCount}`);
        // if (dropCount) {
        //     console.log(`🔄 ----------------------------`);

        // } else if (total) {

        //  }
        // console.log(`🔄 💦 total drops added: ${total - dropCount}`);
    }


};
