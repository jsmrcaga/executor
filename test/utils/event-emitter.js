const { expect } = require('chai');
const { StaticEventEmitter } = require('../../lib/utils/event-emitter');

describe('Utils - StaticEventEmitter', () => {
	it('Should store a new event', () => {
		class FakeEmitter extends StaticEventEmitter {};
		const callback = () => {};
		FakeEmitter.on('plep', callback);
		expect(FakeEmitter.__events['plep'].get(callback)).to.be.eql(callback);
	});

	it('Should remove an existing callback', () => {
		class FakeEmitter extends StaticEventEmitter {};
		const callback = () => {};
		FakeEmitter.on('plep', callback);
		expect(FakeEmitter.__events['plep'].get(callback)).to.be.eql(callback);

		FakeEmitter.removeEventListener('plep2', callback);
		expect(FakeEmitter.__events['plep'].get(callback)).to.be.eql(callback);
		FakeEmitter.removeEventListener('plep', callback);
		expect(FakeEmitter.__events['plep'].get(callback)).to.be.undefined;
	});

	it('Should emit an event with data', done => {
		class FakeEmitter extends StaticEventEmitter {};
		FakeEmitter.on('plep', (arg1, arg2) => {
			expect(arg1).to.be.eql(5);
			expect(arg2).to.be.eql('plep');
			done();
		});
		FakeEmitter.emit('plep', 5, 'plep');
	});

	it('Should store events separately for every child class', () => {
		class FakeEmitter1 extends StaticEventEmitter {};
		class FakeEmitter2 extends StaticEventEmitter {};

		const callback1 = () => {};
		FakeEmitter1.on('plep', callback1);
		
		expect(FakeEmitter1.__events['plep'].get(callback1)).to.be.eql(callback1);
		expect(FakeEmitter2.__events).to.be.null;

		const callback2 = () => {};
		FakeEmitter2.on('plep', callback2);
		expect(FakeEmitter1.__events['plep'].size).to.be.eql(1);
		expect(FakeEmitter2.__events['plep'].size).to.be.eql(1);
	});
});
