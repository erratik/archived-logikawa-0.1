const _ = require('lodash');
const moment = require('moment');

module.exports = {
    composeParams: (options, drops) => {

        // if fetching past but there are no drops, fetch fute/present
        isFetchingPast = !!(options.isFetchingPast && drops.length);
        
        let dropOldest, dropNewest, params;

        if (drops.length) {
            dropOldest = _.minBy(drops, (o) => o['timestamp']);
            dropNewest = _.maxBy(drops, (o) => o['timestamp']);
        } else {
            dropOldest = { timestamp: Date.now() };
        }

        
        switch (options.space) {
            case 'tumblr':
                params = { limit: 20 };
                if (isFetchingPast) {
                    params.offset = drops.length;
                }
                break;
            case 'spotify':
                params = { limit: 50 };
                if (isFetchingPast) {
                    params.before = dropOldest['timestamp'];
                } else if (drops.length) {
                    params.after = dropNewest['timestamp'];
                }
                break;
            case 'instagram':

                params = { count: 20 };

                if (isFetchingPast) {
                    params.max_id = dropOldest['content']['id'];
                } else if (drops.length) {
                    params.min_id = dropNewest['content']['id'];
                }

                break;
            case 'swarm':

                params = { limit: 20, v: Date.now() };

                if (isFetchingPast) {
                    params.beforeTimestamp = dropOldest['content']['createdAt'];
                } else if (drops.length) {
                    params.afterTimestamp = dropNewest['content']['createdAt'];
                }

                break;
            case 'twitter':

                params = { count: 20, screen_name: 'erratiktart' };

                if (isFetchingPast) {
                    params.max_id = dropOldest['content']['id_str'];
                } else if (drops.length) {
                    params.since_id = dropNewest['content']['id_str'];
                }

                break;
            case 'dribbble':
                params = { per_page: 30 };
                if (isFetchingPast) {
                    // params.date = moment(_.minBy(data.drops, (o) => o['content']['id'])['content']['created']).unix().format('YYYY-MM-DD');
                }
                break;
            case 'moves':
                params = { trackPoints: true };
                
                const count = 7;

                if (isFetchingPast) {
                    params.to = moment(dropOldest['timestamp']).subtract(1, 'days').format('YYYYMMDD');
                    params.from = moment(dropOldest['timestamp']).subtract(count, 'days').format('YYYYMMDD');
                    // params.date = moment(dropOldest['timestamp']).subtract(1, 'days').format('YYYYMMDD');
                } else if (drops.length) {
                    params.to = moment().format('YYYYMMDD');
                    params.from = moment().subtract(count-1, 'days').format('YYYYMMDD');
                } else {
                    params.to = moment().format('YYYYMMDD');
                    params.from = moment().subtract(count-1, 'days').format('YYYYMMDD');
                }
                
                break;
            case 'facebook':

                const extraFields = '{full_picture,id,link,story_tags,with_tags,place,type,message_tags,shares,likes,picture,permalink_url,attachments{media,url,type},message,privacy,created_time,comments,updated_time}';

                params = { date: moment().format('YYYYMMDD'), fields: 'posts.limit(20)' };

                if (isFetchingPast) {
                    params.date = moment(dropOldest['timestamp']).subtract(1, 'days').format('YYYYMMDD');
                    params.fields += `.until(${moment(dropOldest['timestamp']).subtract(1, 'minute').format('x') / 1000})`;
                } else if (drops.length) {
                    params.date = moment(dropNewest['timestamp']).add(1, 'days').format('YYYYMMDD');
                }

                params.fields += extraFields;

                break;
        }

        return params;

    }
};
