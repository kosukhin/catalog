import { createMessage } from '../../lib/protocol/message.ts';
import type { ActorContext } from '../../lib/actor.ts';
import * as physics from '../physicsAgent.ts';
import * as toilet from '../toiletAgent.ts';
import type { HumanStatus } from './status.ts';

export function startToilet(status: HumanStatus, context: ActorContext): void {
    status.toilet = 'запросил';
    status.state = 'идёт в туалет';
    context.log('хочу в туалет');
    context.send(toilet.TOILET_AGENT_ID, createMessage(toilet.TOILET_REQUEST, { id: context.id, replyTo: context.id }));
}

export function waitForToilet(status: HumanStatus, context: ActorContext): void {
    context.log('в списке желающих, иду к туалету');
    walkToToilet(status, context);
}

export function goToToilet(status: HumanStatus, context: ActorContext): void {
    status.toilet = 'идёт';
    status.toiletPass = true;
    context.log('место моё, иду в туалет');
    walkToToilet(status, context);
}

export function walkToToilet(status: HumanStatus, context: ActorContext): void {
    status.walkingToToilet = true;
    status.atToiletDoor = false;
    status.state = 'идёт в туалет';
    context.send(physics.PHYSICS_AGENT_ID, createMessage(physics.PHYSICS_MOVE_TO, { id: context.id, targetId: toilet.TOILET_AGENT_ID, replyTo: context.id }));
}

export function retryToilet(status: HumanStatus, context: ActorContext): void {
    if (status.toilet === 'нет' || status.toilet === 'внутри' || status.walkingToToilet || status.atToiletDoor) {
        return;
    }
    walkToToilet(status, context);
}

export function leaveToilet(status: HumanStatus, context: ActorContext): void {
    status.toilet = 'нет';
    status.toiletPass = false;
    status.walkingToToilet = false;
    status.atToiletDoor = false;
    context.log('вышел из туалета');
    if (status.house !== null) {
        status.walkingHome = true;
        status.state = 'идёт домой';
        context.send(physics.PHYSICS_AGENT_ID, createMessage(physics.PHYSICS_MOVE_TO, { id: context.id, targetId: status.house, replyTo: context.id }));
        return;
    }
    status.state = 'активен';
}

export function onArrived(status: HumanStatus, context: ActorContext): void {
    if (status.walkingHome) {
        status.walkingHome = false;
        status.state = 'активен';
        context.log('вернулся домой');
        return;
    }
    if (!status.walkingToToilet) {
        return;
    }
    status.walkingToToilet = false;
    if (!status.toiletPass) {
        status.atToiletDoor = true;
        status.state = 'идёт в туалет';
        context.log('стою у туалета, жду место');
        return;
    }
    status.toiletPass = false;
    status.toilet = 'внутри';
    status.state = 'в туалете';
    context.log('я в туалете');
    context.send(toilet.TOILET_AGENT_ID, createMessage(toilet.TOILET_ENTER, { id: context.id }));
}

export function onPhysicsReport(status: HumanStatus, payload: unknown, context: ActorContext): void {
    const report = payload as { accepted?: unknown; reason?: unknown } | undefined;
    if (report?.accepted === true) {
        return;
    }
    const reason = typeof report?.reason === 'string' ? report.reason : 'отказ физики';
    if (status.walkingHome) {
        status.walkingHome = false;
        status.state = 'активен';
        context.log(`домой не дойти: ${reason}`);
        return;
    }
    if (status.toilet === 'нет' || status.toilet === 'внутри') {
        return;
    }
    status.walkingToToilet = false;
    status.atToiletDoor = false;
    status.state = 'идёт в туалет';
    context.log(`до туалета не дойти: ${reason}, попробую ещё`);
}
