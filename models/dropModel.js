const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
var _ = require('lodash');
var moment = require('moment');
const FetchingService = require('../services/fetch-params.service');
const Rain = require('./rainModel');
const DropService = require('../services/drop.service');

const dropSchema = new mongoose.Schema({
	type: String,
	timestamp: Number,
	content: {}
});

let Drop;
const DropSchema = {
	schema: {
		space: String,
		drops: [dropSchema]
	},
	self: {
		getSpaceDrops: function (params, cb) {

			const that = this;
			const query = params.space === 'all' ? {} : {
				space: params.space
			};
			that.findOne(query, function (err, result) {
				if (err) cb(err);
				if (result) {

					const dropDocId = result._id;

					const timestampQuery = (!!params.query && !!params.query.max) ? {
						'drops.timestamp': {
							$lt: Number(params.query.max)
						}
					} : {
						'drops.timestamp': {
							$lt: Date.now()
						}
					};
					if (!!params.query && !!params.query.min) {
						timestampQuery['drops.timestamp']['$gt'] = Number(params.query.min);
					}

					let aggregation = {
						base: [{
								$match: {
									space: params.space,
									"_id": dropDocId
								}
							},
							{
								$unwind: "$drops"
							},
							{
								$match: timestampQuery
							},
							{
								$sort: {
									'drops.timestamp': -1
								}
							},
							{
								$project: {
									_id: '$_id',
									drops: '$drops',
									type: '$drops.type'
								}
							},
							{
								$group: {
									_id: '$type',
									count: {
										'$sum': 1
									},
									drops: {
										$push: '$drops'
									}
								}
							}
						],
						getType: [{
								$group: {
									_id: '$_id',
									aggregatedDrops: {
										$addToSet: '$drops'
									}
								}
							},
							{
								$match: {
									'_id': params.type
								}
							}
						],
						getAllByType: [{
							$group: {
								_id: params.space,
								types: {
									$push: {
										type: '$_id',
										count: '$count',
										drops: '$drops'
									}
								}
							}
						}],
						getTimestamp: [{
								$match: {}
							},
							{
								$unwind: "$drops"
							},
							{
								$match: timestampQuery
							},
							{
								$sort: {
									'drops.timestamp': -1
								}
							},
							{
								$limit: (!!params.query && !!params.query.limit) ? Number(params.query.limit) : 20
							},
							{
								$unwind: "$drops.type"
							},
							{
								$project: {
									_id: '$_id',
									type: '$drops.type',
									drops: '$drops',
									space: '$space'
								}
							},
							{
								$group: {
									_id: '$space',
									count: {
										'$sum': 1
									},
									drops: {
										$push: '$drops'
									}
								}
							}
						]
					};

					const options = params.type !== 'drops' ? aggregation.getType : aggregation.base;
					const query = params.space === 'all' ? aggregation.getTimestamp : aggregation.base.concat(options);

					that.aggregate(query).exec(function (err, docs) {
						if (err) cb(err);
						if (!!docs) {
							let drops;
							let typedDrops = [];
							let limit = (!!params.query && !!params.query.limit) ? Number(params.query.limit) : 20;
							if (docs.length) {
								if (params.type === 'drops') {
									Object.keys(docs[0].types).forEach((typeKey) => {
										typedDrops = typedDrops.concat(docs[0].types[typeKey].drops);
									});
									drops = typedDrops.slice(0, limit);

								} else if (!!docs[0].aggregatedDrops && docs[0].aggregatedDrops[0].length) {
									const aggDrops = docs[0].aggregatedDrops[0];
									drops = limit ? aggDrops.slice(0, limit) : aggDrops;
								} else if (params.space === 'all') {
									drops = docs;
								}
							} else {

								console.log('empty aggregate query result for: ', query)
								drops = [];
							}

							cb(drops);
						}
					});
				}

			});

		},
		writeStory: function (params, cb) {

			let fromTs, toTs;

			if (!!params.from && !!params.to) {
				fromTs = Number(moment(params.from, 'YYYYMMDD').startOf().format('x'));
				toTs = Number(moment(params.to, 'YYYYMMDD').endOf().format('x'));
			} else {
				fromTs = Number(moment(params.day, 'YYYYMMDD').startOf('day').format('x')) || Number(moment().startOf('day').format('x'));
				toTs = Number(moment(params.day, 'YYYYMMDD').endOf('day').format('x')) || Number(moment().endOf('day').format('x'));
			}

			this.aggregate(
				[
					{
						$match: {}
					},
					{
						$project: {
							"_id": "$space",
							"drops": "$drops"
						}
					},
					{
						$unwind: {
							path: "$drops"
						}
					},
					{
						$group: {
							"_id": "$_id",
							"drops": {
								$push: "$drops"
							}
						}
					},
					{
						$unwind: {
							path: "$drops"
						}
					},
					{
						$match: {
							"drops.timestamp": {
								$lt: toTs,
								$gte: fromTs
							}
						}
					},
					{
						$group: {
							"_id": "$_id",
							"drops": {
								$push: "$drops"
							}
						}
					},
					{
						$unwind: {
							path: "$drops"
						}
					},
					{
						$project: {
							_id: "$_id",
							drop: {
								timestamp: "$drops.timestamp",
								content: "$drops.content",
								type: "$drops.type",
								space: "$_id",
								drop_id: "$drops._id"
							}
						}
					},
					{
						$group: {
							"_id": "$_id",
							"items": {
								$push: "$drop"
							}
						}
					},
					{
						$unwind: {
							path: "$items"
						}
					},
					{
						$project: {
							_id: "$items.content.date",
							drops: "$items"
						}
					},
					{
						$group: {
							"_id": "$_id",
							"items": {
								$push: "$drops"
							}
						}
					},

				]
			).exec((err, docs) => {
				if (err) cb(err);
				if (!docs.length) {
					cb({'err': `no story or items found on ${moment(fromTs).format('YYYYMMDD')}`});
				}
				
				let [drops] = docs.filter(o => !o._id);
				const spaces = !!drops ? [...new Set(drops.items.map(drop => drop.space))] : null;
				
				Rain.findAllRain({
					spaces
				}, (rain) => {

					const dimensions = {};
					let msg = '';
					let stats;
					let status;
					let stories;

					rain.forEach(rainModel => {
						dimensions[rainModel.space] = rainModel.dimensions;
					});

					if (!drops) {
						msg = `no data found on ${moment(fromTs).format('YYYYMMDD')}`;
						status = 'danger';
						stories = null;
					} else if (!!drops.items.length) {
						
						drops.items = drops.items.map(drop => DropService.enrichDrop(drop, dimensions[drop.space].filter(dim => dim.type === drop.type)));
	
						[stories] = docs.filter(o => !!o._id).map(story => story.items.filter(item => item.type === 'rain.storyline'));
	
						if (stories.length) {
							msg = `storyline found on ${moment(fromTs).format('YYYYMMDD')}`;
							status = 'success';
							stories = stories.map(story => {
								
								let segments = story.content.segments;
								if (!!segments) {
									segments = segments.map(segment => {
										if (!!segment.activities) {
											segment.activities = segment.activities.map(activity => {
			
												activity.startTime = activity.timestamp = Number(moment(activity.startTime).format('x'));
												activity.endTime = Number(moment(activity.endTime).format('x'));
												activity.drops = !!drops.items ? drops.items.filter((d, i) => {
													const isActivityDrop = d.timestamp > activity.startTime && d.timestamp < activity.endTime;
													if (isActivityDrop) {
														drops.items.splice(i, 1);
													}
													return isActivityDrop;
												}) : null;
												if (activity.trackPoints.length) {
													activity.trackPoints = activity.trackPoints.map(p => {
														p.time = Number(moment(p.time).format('x'));
														return p;
													});
												}
												return activity;
			
											});
										}
		
										segment.startTime = segment.timestamp = Number(moment(segment.startTime).format('x'));
										segment.endTime = Number(moment(segment.endTime).format('x'));
		
										if (segment.type === 'place') {
											const placeDrops = drops.items.filter(item => item.timestamp > segment.startTime && item.timestamp < segment.endTime)
											segment.place.drops = drops.items.length ? drops.items : null;
										}
		
										return segment;
									});
								}
								return story;
							});
							
							if (!stories[0].content.summary) {
								msg += `, but is still in progress (incomplete)`;
								status = 'warning';
								stories = drops.items;
							}
							
						} else {
							msg = `no storylines found on ${moment(fromTs).format('YYYYMMDD')}`;
							status = 'warning';
							stories = drops.items;
						}

					}

					// MAKE STATS
					stats = spaces.map(s => {
						const dropCnt = drops.items.filter(d => d.space === s);
						return {space: s, count: dropCnt.length};
					});

					cb({msg, status, stats, items: stories});

				});

			});
		},
		findAll: function (options, cb) {

			const query = options;

			this.findOne(query, function (err, docs) {
				if (err) cb(err);
				cb(docs[0]);
			});
		},
		countByTypes: function (spaceName, cb) {
			this.aggregate({
				$match: {
					space: spaceName
				}
			}, {
				$unwind: "$drops"
			}, {
				$unwind: "$drops.type"
			}, {
				$project: {
					_id: '$_id',
					type: '$drops.type'
				}
			}, {
				$group: {
					_id: '$type',
					count: {
						'$sum': 1
					}
				}
			}, {
				$group: {
					_id: spaceName,
					types: {
						$push: {
							type: '$_id',
							count: '$count'
						}
					}
				}
			}, (err, docs) => {
				const types = docs.length ? docs[0].types : [];
				cb(types);
			});
		},
		findDrop: function (space, id, cb) {

			const dropid = new ObjectId(id);
			const query = {
				space: space,
				'drops._id': dropid
			};
			const subQuery = {
				'_id': dropid
			};

			this.find(query, {
				'drops.$': 1
			}, function (err, docs) {
				cb(docs)
			});

		},
		removeDrops: function (space, dropIds, cb) {
			var query = {
				space: space
			};
			const drops = dropIds.map(drop => ObjectId(drop));
			// this.update(query, { $pull: { 'drops': {$in: drops}  } }, { multi: true }, function (error, _updated) {
			//     if (_updated.ok) {
			//         cb('');
			//     }
			// });
		},
		writeDrops: function (space, drops, type, cb) {
			const query = {
				space: space,
				'drops.type': type
			};
			var that = this;

			let dateFormat = null;

			// TODO: move this to constants
			switch (space) {
				case 'swarm':
				case 'instagram':
					dateFormat = 'X';
					break;
				case 'twitter':
					dateFormat = 'ddd MMM DD hh:mm:ss Z YYYY';
					break;
				case 'spotify':
				case 'dribbble':
					dateFormat = moment.defaultFormat;
					break;
				case 'tumblr':
					dateFormat = 'YYYY-MM-DD hh:mm:ss GMT';
					break;
				case 'moves':
					dateFormat = 'YYYYMMDD';
					break;
				case 'facebook':

					dateFormat = 'YYYY-MM-DDTHH:mm:ssZ';
					break;
				default:


			}
			var addSchema = function (callback) {

				drops = drops.map((drop, i) => {

					// this needs to be come something that can save dimensions, REAL dimensions
					const possibleTimestampKeys = ['created_time', 'date', 'timestamp', 'time', 'created_at', 'played_at', 'createdAt', 'startTime', 'endTime'];

					Object.keys(drop.content).map(key => {
						if (possibleTimestampKeys.includes(key)) {
							drop.timestamp = dateFormat ? moment(drop.content[key], dateFormat).format('x') : moment.unix(drop.content[key]).format('X');
							drop.timestamp = (key !== 'timestamp') ? Number(drop.timestamp) : Number(moment(drop.content[key], 'X').format('x'));
						}
					});

					return drop;

				});

				if (space !== 'moves') {
					drops = drops.filter(drop => !existingDropTimestamps.includes(Number(drop.timestamp)));
				}

				if (space == 'moves') {
					that.findOneAndUpdate({
							space: space
						}, {
							$pull: {
								drops: {
									timestamp: {
										$in: drops.map(drop => drop.timestamp)
									},
									type
								}
							}
						}, {
							multi: true
						},
						(err, updated) => {
							// debugger;

						});
				}

				if (drops.length) {

					that.findOneAndUpdate({
							space: space
						}, {
							$addToSet: {
								drops: {
									$each: drops
								}
							}
						}, {
							upsert: true,
							returnNewDocument: true
						},
						(err, updated) => {
							if (!!updated) {
								const lastDrop = _.max(_.filter(updated.drops, {
									type
								}), function (o) {
									return o.timestamp;
								});
								const lastDropAdded = _.min(_.filter(drops, {
									type
								}), function (o) {
									return o.timestamp;
								});
								if (!!lastDropAdded) {
									console.log(`[dropModel] 💧 ${drops.length} | ${type} added on ${space} `);
									cb(updated.drops, lastDropAdded, drops.length);
								}

							} else {
								cb([], null, 0);
							}
						});

				} else {

					cb([], null, 0);
				}

			};



			let existingDropTimestamps = [];
			that.findOne(query, function (err, spaceDrops) {
				if (!!spaceDrops) {
					existingDropTimestamps = spaceDrops.drops.map(drop => {
						if (drop.timestamp && drop.type === type)
							return drop.timestamp
					});
				}

				addSchema(cb);
			});

		}
	}
};
Drop = require('./createModel')(mongoose, 'Drop', DropSchema);
module.exports = Drop;
