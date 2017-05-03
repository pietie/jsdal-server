"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sql = require("mssql");
class OrmDAL {
    static SprocGenGetRoutineListCnt(con, maxRowDate) {
        return new Promise((resolve, reject) => {
            (new sql.Request(con))
                .input('maxRowver', sql.BigInt, maxRowDate)
                .execute('orm.SprocGenGetRoutineListCnt').then(function (result) {
                if (result && result.length > 0 && result[0].length > 0)
                    resolve(result[0][0].CNT);
                else
                    reject();
            }).catch(function (err) {
                reject(err);
            });
            return null;
        });
    }
    static SprocGenGetRoutineListStream(con, maxRowDate) {
        let request = new sql.Request(con);
        request.stream = true;
        request
            .input('maxRowver', sql.BigInt, maxRowDate)
            .execute('orm.SprocGenGetRoutineList');
        return request;
    }
    static RoutineGetFmtOnlyResults(con, schema, routine, parameterList) {
        return new Promise((resolve, reject) => {
            let resultSets = null;
            let request = new sql.Request(con);
            request.stream = true;
            let parms = parameterList.filter(p => p.IsResult != "YES").map(p => p.ParameterName + ' = null');
            // TODO: Get 'brackettedName' like in C# dbCmd.CommandText = GetBrackettedName(schema, routine);
            let query = `set fmtonly on; exec ${schema}.${routine} ${parms.join(',')};`;
            request.on('recordset', (columns) => {
                // for every result set
                if (!resultSets)
                    resultSets = [];
                // ColumnName = row.Field<string>("ColumnName"),
                // DataType = row.Field<Type>("DataType").FullName, 
                // DbDataType = row.Field<string>("DataTypeName"),
                // ColumnSize = row.Field<int>("ColumnSize"),
                // NumericalPrecision = row.Field<short>("NumericPrecision"),
                // NumericalScale = row.Field<short>("NumericScale"),
                //console.log("!!!\t", columns);
                //return;
                let cols = [];
                for (let e in columns) {
                    let col = columns[e];
                    cols.push({
                        ColumnName: col.name,
                        DataType: col.type,
                        ColumnSize: col.length,
                        NumericalPrecision: col.precision,
                        NumericalScale: col.scale
                    });
                }
                resultSets.push(cols);
            });
            request.on('error', function (err) {
                // May be emitted multiple times
                reject(err); // possible move to done .. so keep track of any and all errors and then reject in done if necessary
            });
            request.on('done', function (affected) {
                resolve(resultSets);
            });
            request.query(query);
        });
    }
    static mapDbTypeToSqlDriverType(dbType) {
        dbType = dbType.toLowerCase();
        if (dbType == "varchar")
            return sql.VarChar;
        else if (dbType == "nvarchar")
            return sql.NVarChar;
        else if (dbType == "int")
            return sql.Int;
        else if (dbType == "bigint")
            return sql.BigInt;
        else if (dbType == "uniqueidentifier")
            return sql.UniqueIdentifier;
        else if (dbType == "bit")
            return sql.Bit;
        else if (dbType == "date")
            return sql.Date;
        else if (dbType == "datetime")
            return sql.DateTime;
        else if (dbType == "datetime2")
            return sql.DateTime2;
        else if (dbType == "datetimeoffset")
            return sql.DateTimeOffset;
        else if (dbType == "smalldatetime")
            return sql.SmallDateTime;
        else if (dbType == "time")
            return sql.Time;
        else if (dbType == "money")
            return sql.Money;
        else if (dbType == "decimal")
            return sql.Decimal;
        else if (dbType == "float")
            return sql.Float;
        else if (dbType == "real")
            return sql.Real;
        else if (dbType == "smallmoney")
            return sql.SmallMoney;
        else if (dbType == "tinyint")
            return sql.TinyInt;
        else if (dbType == "smallint")
            return sql.SmallInt;
        else if (dbType == "text")
            return sql.Text;
        else if (dbType == "binary")
            return sql.Binary;
        else if (dbType == "varbinary")
            return sql.VarBinary;
        else if (dbType == "image")
            return sql.Image;
        else if (dbType == "xml")
            return sql.Xml;
        else if (dbType == "char")
            return sql.Char;
        else if (dbType == "nchar")
            return sql.NChar;
        else if (dbType == "ntext")
            return sql.NText;
        else if (dbType == "tvp")
            return sql.TVP;
        else if (dbType == "udt")
            return sql.UDT;
        else if (dbType == "geography")
            return sql.Geography;
        else if (dbType == "geometry")
            return sql.Geometry;
        else if (dbType == "table type")
            return sql.VarChar;
        else if (dbType == "sql_variant")
            return sql.VarChar;
        else {
            throw `Unsupported dbType: ${dbType}`;
        }
    }
}
exports.OrmDAL = OrmDAL;
//# sourceMappingURL=orm-dal.js.map