const sql = require("mssql");

var TokenContextPlugin = (function () {
    function TokenContextPlugin() {
		this.Name = "TokenGuid Auth";
		this.Description = "Call LoginSetContextInfo for sproc authentication, using the 'tokenGuid' query string parameter.";
		this.Guid = "2003f9a8-5707-4b79-a216-737a7f11eb83";
    }
    TokenContextPlugin.prototype.OnConnectionOpened = function (con, queryString) {

		if (typeof(queryString.tokenGuid) !== "undefined")
		{	
			var request = new sql.Request(con);

			request.input('tokenGuid', sql.UniqueIdentifier, queryString.tokenGuid);

			request.execute('dbo.LoginSetContextInfo', function(err, recordsets, returnValue, affected) {
				if (err)
				{
					console.error(err);
				}
			});
		}
		
    };
    return TokenContextPlugin;
}());


module.exports = {
  plugins: [ TokenContextPlugin ]
};