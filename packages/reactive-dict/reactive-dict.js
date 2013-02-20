(function () {

  // XXX come up with a serialization method which canonicalizes object key
  // order, which would allow us to use objects as values for equals.
  var stringify = function (value) {
    if (value === undefined)
      return 'undefined';
    return EJSON.stringify(value);
  };
  var parse = function (serialized) {
    if (serialized === undefined || serialized === 'undefined')
      return undefined;
    return EJSON.parse(serialized);
  };

  // migrationData, if present, should be data previously returned from getMigrationData()
  ReactiveDict = function (migrationData) {
    this.keys = migrationData || {}; // key -> value
    this.keyDeps = {}; // key -> _ContextSet
    this.keyValueDeps = {}; // key -> value -> _ContextSet
  };

  _.extend(ReactiveDict.prototype, {
    set: function (key, value) {
      var self = this;

      value = stringify(value);

      var oldSerializedValue = 'undefined';
      if (_.has(self.keys, key)) oldSerializedValue = self.keys[key];
      if (value === oldSerializedValue)
        return;
      self.keys[key] = value;

      var invalidateAll = function (cset) {
        cset && cset.invalidateAll();
      };

      invalidateAll(self.keyDeps[key]);
      if (self.keyValueDeps[key]) {
        invalidateAll(self.keyValueDeps[key][oldSerializedValue]);
        invalidateAll(self.keyValueDeps[key][value]);
      }
    },

    get: function (key) {
      var self = this;
      self._ensureKey(key);
      self.keyDeps[key].addCurrentContext();
      return parse(self.keys[key]);
    },

    equals: function (key, value) {
      var self = this;
      var context = Meteor.deps.Context.current;

      // We don't allow objects (or arrays that might include objects) for
      // .equals, because JSON.stringify doesn't canonicalize object key
      // order. (We can make equals have the right return value by parsing the
      // current value and using EJSON.equals, but we won't have a canonical
      // element of keyValueDeps[key] to store the context.) You can still use
      // "EJSON.equals(ReactiveDict.get(key), value)".
      //
      // XXX we could allow arrays as long as we recursively check that there
      // are no objects
      if (typeof value !== 'string' &&
          typeof value !== 'number' &&
          typeof value !== 'boolean' &&
          typeof value !== 'undefined' &&
          !(value instanceof Date) &&
          !(typeof Meteor.Collection !== 'undefined' && value instanceof Meteor.Collection.ObjectID) &&
          value !== null)
        throw new Error("ReactiveDict.equals: value must be scalar");
      var serializedValue = stringify(value);

      if (context) {
        self._ensureKey(key);

        if (! _.has(self.keyValueDeps[key], serializedValue))
          self.keyValueDeps[key][serializedValue] = new Meteor.deps._ContextSet;

        var isNew = self.keyValueDeps[key][serializedValue].add(context);
        if (isNew) {
          context.onInvalidate(function () {
            // clean up [key][serializedValue] if it's now empty, so we don't
            // use O(n) memory for n = values seen ever
            if (self.keyValueDeps[key][serializedValue].isEmpty())
              delete self.keyValueDeps[key][serializedValue];
          });
        }
      }

      var oldValue = undefined;
      if (_.has(self.keys, key)) oldValue = parse(self.keys[key]);
      return EJSON.equals(oldValue, value);
    },

    _ensureKey: function (key) {
      var self = this;
      if (!(key in self.keyDeps)) {
        self.keyDeps[key] = new Meteor.deps._ContextSet;
        self.keyValueDeps[key] = {};
      }
    },

    // Get a JSON value that can be passed to the constructor to
    // create a new ReactiveDict with the same contents as this one
    getMigrationData: function () {
      // XXX sanitize and make sure it's JSONible?
      return this.keys;
    }
  });

}());
