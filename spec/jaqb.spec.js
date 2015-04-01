/**
 * JavaScript QueryBuilder for SQLite
 * Test Suite & User Guide
 *
 * @author Guerric Sloan
 * @repository https://github.com/fdn/jaqb
 * @license Licensed under MIT
 */
define(function(require) {
  var _ = require('underscore');
  var jaqb = require('jaqb');

  describe('jaqb', function() {

    beforeEach(function() {
    });

    it('can generate select query', function() {
      var query = jaqb.select('t1');
      expect(query.toString()).toEqual('SELECT * FROM t1');

      query = jaqb.select();
      query.tables('t1', 't2');
      expect(query.toString()).toEqual('SELECT * FROM t1, t2');
    });

    it('can add fields to query', function() {
      var query = jaqb.select('t1');
      query.field('first').field('second', 'third');
      expect(query.toString()).toEqual('SELECT first, second, third FROM t1');
    });

    it('can add conditions to query', function() {
      var query = jaqb.select('t1');
      query.where().field('first').gt().field('second');
      expect(query.toString()).toEqual('SELECT * FROM t1 WHERE first > second');

      query = jaqb.select('t1');
      query.where().field('first').equals().value(10);

      // TODO: do we need type specific value handling?
      expect(query.toString()).toEqual("SELECT * FROM t1 WHERE first = '10'");

      // and multiple where clauses
      query = jaqb.select('t1');
      var where = query.where().field('first').equals().field('second');
      where.and().field('second').equals().field('second');
      expect(query.toString()).toEqual('SELECT * FROM t1 WHERE first = second AND (second = second)');

      // or where clause
      query = jaqb.select('t1');
      var where = query.where().field('first').equals().field('second');
      where.or().field('second').equals().field('second');
      expect(query.toString()).toEqual('SELECT * FROM t1 WHERE first = second OR (second = second)');

      // or and
      query = jaqb.select('t1');
      var where = query.where().field('first').equals().field('second');
      var or = where.or().field('second').equals().field('second');
      or.and().field('third').lte().value('fifty');
      expect(query.toString()).toEqual(
        "SELECT * FROM t1 WHERE first = second OR (second = second AND (third <= 'fifty'))"
      );
    });

    /**
     * Convenience for looping to avoid checking for first condition
     */
    it('can handle extra condition operator', function() {
      query = jaqb.select('t1');
      var where = query.where().or();
      where.field('first').equals().field('second');
      expect(query.toString()).toEqual(
        "SELECT * FROM t1 WHERE first = second"
      );
      query = jaqb.select('t1');
      var where = query.where().or();
      where.field('first').equals().field('second');
      where.or().field('second').equals().field('third');
      expect(query.toString()).toEqual(
        "SELECT * FROM t1 WHERE first = second OR (second = third)"
      );
    });

    it('can generate insert query', function() {
      var query = jaqb.insert('t1');
      query.field('first', 1);
      expect(query.toString()).toEqual("INSERT INTO t1 (first) VALUES ('1')");

      query = jaqb.insert('t1');
      query.field('first', 1);
      query.field('second', 2).field('third', 3);
      expect(query.toString()).toEqual("INSERT INTO t1 (first, second, third) VALUES ('1', '2', '3')");
    });

    it('can generate update query', function() {
      var query = jaqb.update('t1');
      query.field('first', 1);
      expect(query.toString()).toEqual("UPDATE t1 SET first = '1'");

      query = jaqb.update('t1');
      query.field('first', 1);
      query.field('second', 2).field('third', 3);
      expect(query.toString()).toEqual("UPDATE t1 SET first = '1', second = '2', third = '3'");

      query = jaqb.update('t1');
      query.field('first', 1);
      query.where().field('second').equals().value(2);
      expect(query.toString()).toEqual("UPDATE t1 SET first = '1' WHERE second = '2'");
    });

    it('can generate create table query', function() {
      var query = jaqb.create('t1');
      expect(query.toString()).toEqual('CREATE TABLE IF NOT EXISTS t1 ()');

      query.field('f1');
      expect(query.toString()).toEqual('CREATE TABLE IF NOT EXISTS t1 (f1 TEXT)');

      query.field('f2');
      expect(query.toString()).toEqual('CREATE TABLE IF NOT EXISTS t1 (f1 TEXT, f2 TEXT)');

      query.field('f3', 'INTEGER');
      expect(query.toString()).toEqual('CREATE TABLE IF NOT EXISTS t1 (f1 TEXT, f2 TEXT, f3 INTEGER)');

      query.field('f3', 'DOUBLE');
      expect(query.toString()).toEqual('CREATE TABLE IF NOT EXISTS t1 (f1 TEXT, f2 TEXT, f3 DOUBLE)');
    });

    it('can generate create table query with primary key', function() {
      var query = jaqb.create('t1');
      query.fields().primaryKey('f1');
      expect(query.toString()).toEqual('CREATE TABLE IF NOT EXISTS t1 (f1 INTEGER PRIMARY KEY)');
    });
  });
});
