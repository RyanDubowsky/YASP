var async = require('async');
module.exports = function getStatus(db, redis, queue, cb) {
    console.time('status');
    async.series({
        matches: function(cb) {
            db.from('matches').count().asCallback(function(err, count) {
                extractCount(err, count, cb);
            });
        },
        players: function(cb) {
            db.from('players').count().asCallback(function(err, count) {
                extractCount(err, count, cb);
            });
        },
        user_players: function(cb) {
            db.from('players').count().whereNotNull('last_login').asCallback(function(err, count) {
                extractCount(err, count, cb);
            });
        },
        full_history_players: function(cb) {
            db.from('players').count().whereNotNull('full_history_time').asCallback(function(err, count) {
                extractCount(err, count, cb);
            });
        },
        tracked_players: function(cb) {
            redis.get("trackedPlayers", function(err, res) {
                res = res ? Object.keys(JSON.parse(res)).length : 0;
                cb(err, res);
            });
        },
        rating_players: function(cb) {
            redis.get("ratingPlayers", function(err, res) {
                res = res ? Object.keys(JSON.parse(res)).length : 0;
                cb(err, res);
            });
        },
        donated_players: function(cb) {
            redis.get("donators", function(err, res) {
                res = res ? Object.keys(JSON.parse(res)).length : 0;
                cb(err, res);
            });
        },
        cached_players: function(cb) {
            redis.keys("player:*", function(err, result) {
                cb(err, result.length);
            });
        },
        matches_last_day: function(cb) {
            redis.keys("added_match:*", function(err, result) {
                cb(err, result.length);
            });
        },
        parsed_last_day: function(cb) {
            redis.keys("parsed_match:*", function(err, result) {
                cb(err, result.length);
            });
        },
        requested_last_day: function(cb) {
            redis.keys("requested_match:*", function(err, result) {
                cb(err, result.length);
            });
        },
        last_added: function(cb) {
            db.from('matches').orderBy('match_id', 'desc').limit(10).asCallback(cb);
        },
        last_parsed: function(cb) {
            db.from('matches').where('version', '>', 0).orderBy('match_id', 'desc').limit(10).asCallback(cb);
        },
        kue: function(cb) {
            var counts = {};
            queue.types(function(err, data) {
                if (err) {
                    return cb(err);
                }
                async.each(data, function(d, cb) {
                    // others are activeCount, completeCount, failedCount, delayedCount
                    queue.inactiveCount(d, function(err, result) {
                        counts[d] = result;
                        cb(err);
                    });
                }, function(err) {
                    cb(err, counts);
                });
            });
        }
    }, function(err, results) {
        console.timeEnd('status');
        //TODO psql counts are returned as [{count:'string'}].  If we want to do math with them we need to numberify them
        cb(err, results);
    });

    function extractCount(err, count, cb) {
        if (err) {
            return cb(err);
        }
        cb(err, Number(count[0].count));
    }
};