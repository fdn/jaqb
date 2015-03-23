/**
 * JavaScript QueryBuilder for SQLite
 *
 * @author Guerric Sloan
 * @repository https://github.com/fdn/jaqb
 * @license Licensed under MIT
 */
(function() {

  function injectDependencies(_) {
    var TYPE_SELECT = 'SELECT';
    var TYPE_INSERT = 'INSERT';
    var TYPE_UPDATE = 'UPDATE';
    var TYPE_CREATE = 'CREATE';

    function Query(type, tables) {

      // select, insert
      this._type = type;
      this._tables = tables || [];
      switch (this._type) {
        case TYPE_SELECT:
          this._fields = new QueryFields();
          break;
        case TYPE_INSERT:
          this._fields = new InsertFields();
          break;
        case TYPE_UPDATE:
          this._fields = new UpdateFields();
          break;
        case TYPE_CREATE:
          this._fields = new CreateFields();
      }
    }

    _.extend(Query.prototype, {

      field: function (key, value) {
        if (arguments.length == 0) {
          throw 'No field name specified';
        }
        if (this._type == TYPE_SELECT) {
          _.each(arguments, function (arg) {
            this._fields.set(arg);
          }, this);
        } else {
          this._fields.set(key, value);
        }
        return this;
      },

      fields: function() {
        return this._fields;
      },

      tables: function (/* table1, ... */) {
        this._tables = this._tables.concat(_.toArray(arguments));
        return this;
      },

      where: function (/* field1, op, field2? */) {
        var args = _.toArray(arguments);

        // query condition builder mode!
        if (args.length == 0) {
          var condition = new ConditionBuilder(this);
          this._where = condition;
          return condition;
        }

        // @note: saving for future use
        throw 'where(args): Not supported';
      },

      /**
       * Processes the pieces to build the query
       */
      toString: function () {
        var s;
        switch (this._type) {
          case TYPE_SELECT:
            s = this._type + ' ' + this._fields.toString() + ' FROM ' + this._tables.join(', ');
            if (this._where) {
              var where = this._where.toString();
              if (where) {
                s += ' WHERE ' + where;
              }
            }
            break;

          case TYPE_INSERT:
            s = this._type + ' INTO ' + this._tables[0] + ' ' + this._fields.toString();
            break;

          case TYPE_UPDATE:
            s = this._type + ' ' + this._tables[0] + ' SET ' + this._fields.toString();
            if (this._where) {
              var where = this._where.toString();
              if (where) {
                s += ' WHERE ' + where;
              }
            }
            break;

          case TYPE_CREATE:
            s = 'CREATE TABLE IF NOT EXISTS ' + this._tables[0] + ' (' + this._fields.toString() + ')';
            break;
        }
        return s;
      }
    });

    function InsertFields(fields) {

      // TODO: ensure incoming fields is an object
      this._fields = fields || {};
    }

    _.extend(InsertFields.prototype, {
      set: function (field, value) {
        this._fields[field] = value;
      },

      toString: function () {
        var keys = _.keys(this._fields);
        var values = _.values(this._fields);
        values = _.map(values, function (value) {

          // TODO: escape the value
          return "'" + value + "'";
        });
        return '(' + keys.join(', ') + ') VALUES (' + values.join(', ') + ')';
      }
    });

    function QueryFields(fields) {
      this._fields = fields || [];
    }

    _.extend(QueryFields.prototype, {

      // TODO: dedupe set fields
      set: function (field, value) {
        this._fields.push(field);
        return this;
      },

      toString: function () {
        if (this._fields.length == 0) {
          return '*';
        }
        var fields = this._fields.join(', ');
        return fields;
      }
    });

    function CreateFields(fields) {

      // TODO: ensure incoming fields is an object
      this._fields = fields || {};
    }

    _.extend(CreateFields.prototype, {
      primaryKey: function(field) {
        this.set(field, 'PRIMARY');
      },

      set: function (field, type) {
        switch (type) {
          default:
            type = 'TEXT';
          case 'TEXT':
          case 'INTEGER':
          case 'BLOB':
          case 'REAL':
            break;
          case 'PRIMARY':
            type = 'INTEGER PRIMARY KEY';
            break;

        }
        this._fields[field] = type;
      },

      toString: function () {
        var fields = [];
        _.each(this._fields, function(val, key) {
          fields.push(key + ' ' + val);
        });
        return fields.join(', ');
      }
    });

    function UpdateFields(fields) {

      // TODO: ensure incoming fields is an object
      this._fields = fields || {};
    }

    _.extend(UpdateFields.prototype, {

      set: function (field, value) {
        this._fields[field] = value;
        return this;
      },

      toString: function () {
        var fields = [];
        _.each(this._fields, function(val, key) {

          // TODO: escape field values or use params pattern
          fields.push(key + " = '" + val + "'");
        });
        return fields.join(', ');
      }
    });

    function ConditionBuilder(query) {
      this._parentQuery = query;
      this._type = 'where';
      this._field = 1;

      this._nextCondition = null;
    }

    _.extend(ConditionBuilder.prototype, {
      field: function (name) {
        this['_field' + this._field] = name;
        this._field++;
        return this;
      },

      equals: function () {
        this._operator = '=';
        return this;
      },

      gt: function () {
        this._operator = '>';
        return this;
      },

      lt: function () {
        this._operator = '<';
        return this;
      },

      lte: function () {
        this._operator = '<=';
        return this;
      },

      gte: function () {
        this._operator = '>=';
        return this;
      },

      value: function (value) {

        // TODO: escape the value or use params pattern
        this['_field' + this._field] = "'" + value + "'";
        return this;
      },

      and: function () {
        this._nextOperator = 'AND';
        this._nextCondition = new ConditionBuilder(this._parentQuery);
        return this._nextCondition;
      },

      or: function () {
        this._nextOperator = 'OR';
        this._nextCondition = new ConditionBuilder(this._parentQuery);
        return this._nextCondition;
      },

      /**
       * Chaining helper
       * @return {Query}
       */
      end: function () {
        return this._parentQuery;
      },

      toString: function () {
        var condition = this._field1 + ' ' + this._operator + ' ' + this._field2;
        if (this._nextCondition) {
          condition += ' ' + this._nextOperator + ' (' + this._nextCondition.toString() + ')';
        }
        return condition;
      }
    });

    function select(/* tables */) {
      return new Query(TYPE_SELECT, _.toArray(arguments));
    }

    function insert(/* table */) {
      if (arguments.length == 0) {
        throw 'Missing insert table';
      }
      return new Query(TYPE_INSERT, _.toArray(arguments));
    }

    function update(/* table */) {
      if (arguments.length == 0) {
        throw 'Missing update table';
      }
      return new Query(TYPE_UPDATE, _.toArray(arguments));
    }

    function create(/* table */) {
      if (arguments.length == 0) {
        throw 'Missing create table';
      }
      return new Query(TYPE_CREATE, _.toArray(arguments));
    }

    return {
      select: select,
      insert: insert,
      create: create,
      update: update
    }
  }

  // export
  if (typeof define !== 'undefined') {
    define(function(require) {
      var _ = require('underscore');
      return injectDependencies(_);
    });
  }
  if (typeof module !== 'undefined') {
    var _ = require('underscore');
    module.exports = injectDependencies(_);
  }
})();
