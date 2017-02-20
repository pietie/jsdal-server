var TokenContextPlugin = (function () {
    function TokenContextPlugin() {
		this.Name = "TokenGuid Auth";
		this.Description = "Call LoginSetContextInfo for sproc authentication, using the 'tokenGuid' query string parameter.";
    }
    TokenContextPlugin.prototype.OnConnectionOpened = function (con) {
        
		console.log("\r\n\r\n\t!!!!!\tPLUGIN CONNECTION OPENED CALLED!\r\n\r\n");
		
		return null;
    };
    return TokenContextPlugin;
}());


module.exports = {
  plugins: [ TokenContextPlugin ]
};