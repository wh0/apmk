package {

	import flash.display.Sprite;
	import flash.events.NetStatusEvent;
	import flash.events.UncaughtErrorEvent;
	import flash.external.ExternalInterface;
	import flash.net.NetConnection;
	import flash.net.NetStream;
	import flash.net.ObjectEncoding;
	import flash.system.Security;

  [SWF(frameRate=1,width=1,height=1)]
	public class Player extends Sprite {

		private static function addProxy(object:Object, method:String):void {
			ExternalInterface.addCallback(method, function (...rest):void {
				object[method].apply(object, rest);
			});
		}

		private var nc:NetConnection;
		private var ns:NetStream;

		public function Player() {
			Security.allowDomain('*');
			loaderInfo.uncaughtErrorEvents.addEventListener(UncaughtErrorEvent.UNCAUGHT_ERROR, onError);

			nc = new NetConnection();
			nc.objectEncoding = ObjectEncoding.AMF0;
			nc.addEventListener(NetStatusEvent.NET_STATUS, onStatus);
			addProxy(nc, 'connect');

			ExternalInterface.call('player.onLoad');
		}

		private function onError(e:UncaughtErrorEvent):void {
			ExternalInterface.call('console.error', JSON.stringify(e.error));
		}

		private function onStatus(e:NetStatusEvent):void {
			if (e.info.code == 'NetConnection.Connect.Success') {
				ns = new NetStream(nc);
				ns.client = {onPlayStatus: onPlayStatus};
				ns.addEventListener(NetStatusEvent.NET_STATUS, onStatus);
				ns.bufferTime = 2;
				addProxy(ns, 'play');
				addProxy(ns, 'pause');
				addProxy(ns, 'resume');
				addProxy(ns, 'seek');
			}
			ExternalInterface.call('player.onStatus', e.info);
		}

		private function onPlayStatus(info:Object):void {
			ExternalInterface.call('player.onPlayStatus', info);
		}

	}

}
