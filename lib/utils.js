module.exports = that = {
    pluck: (key, array) => {
        if (!!array) {  

            const plucked = array.filter(arr => {
                const _key = arr.keyName ? arr.keyName : arr.label;
                if (_key === key) {
                    return arr.value;
                }
            })[0];
            if (plucked) {
                return plucked.value;
            }
        }
    },
    URLtoObject: (str) => {
        var obj = {};
        str.replace(/([^=&]+)=([^&]*)/g, function(m, key, value) {
            obj[decodeURIComponent(key)] = decodeURIComponent(value);
        });
        return obj;
    }
};
