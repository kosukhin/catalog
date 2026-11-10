import { createMessage } from '../../lib/protocol/message.ts';
import type { ActorContext } from '../../lib/actor.ts';
import * as bank from '../bankAgent.ts';
import * as bulletin from '../bulletinBoardAgent.ts';
import * as catalog from '../humanCatalogAgent.ts';
import * as house from '../houseAgent.ts';
import { EATING_LIMIT, TOILET_LIMIT } from './options.ts';
import type { HumanStatus } from './status.ts';
import { startToilet } from './toilet.ts';

export function decide(status: HumanStatus, context: ActorContext): void {
    if (status.toilet !== 'нет') {
        status.state = status.toilet === 'внутри' ? 'в туалете' : 'идёт в туалет';
        return;
    }
    if (status.walkingHome) {
        status.state = 'идёт домой';
        return;
    }
    if (status.phase === 'ночь') {
        status.state = 'спит';
        return;
    }
    if (status.balance === null) {
        status.state = 'активен';
        if (!status.accountPending) {
            status.accountPending = true;
            context.send(bulletin.BULLETIN_BOARD_AGENT_ID, createMessage(bulletin.BULLETIN_FIND, { type: bank.type, replyTo: context.id }));
        }
        return;
    }
    if (status.house === null) {
        status.state = 'активен';
        if (!status.houseTried) {
            status.houseTried = true;
            context.send(house.HOUSE_AGENT_ID, createMessage(house.HOUSE_BUY, { owner: context.id, bankId: status.bankId, replyTo: context.id }));
        }
        return;
    }
    const roll = status.random();
    if (roll < TOILET_LIMIT) {
        startToilet(status, context);
        return;
    }
    status.state = roll < EATING_LIMIT ? 'принимает пищу' : 'активен';
}

export function onBulletin(status: HumanStatus, payload: unknown, context: ActorContext): void {
    const result = payload as { type?: unknown; ids?: unknown } | undefined;
    if (result?.type !== bank.type) {
        return;
    }
    const ids = Array.isArray(result.ids) ? result.ids.filter((item): item is string => typeof item === 'string') : [];
    if (ids.length === 0) {
        status.accountPending = false;
        context.log('банков не нашлось');
        return;
    }
    const bankId = ids[0] ?? '';
    status.bankId = bankId;
    context.log(`нашёл банк ${bankId}`);
    context.send(bankId, createMessage(bank.BANK_OPEN, { owner: context.id, replyTo: context.id }));
}

export function onAccount(status: HumanStatus, payload: unknown, context: ActorContext): void {
    status.accountPending = false;
    const report = payload as { owner?: unknown; balance?: unknown } | undefined;
    status.balance = typeof report?.balance === 'number' ? report.balance : null;
    context.log(`счёт открыт, на нём ${status.balance}`);
}

export function onHouse(status: HumanStatus, payload: unknown, context: ActorContext): void {
    const report = payload as { houseId?: unknown; accepted?: unknown; reason?: unknown } | undefined;
    if (report?.accepted === true && typeof report.houseId === 'string') {
        status.house = report.houseId;
        context.log(`купил дом ${status.house}`);
        return;
    }
    context.log(`не смог купить дом: ${typeof report?.reason === 'string' ? report.reason : 'отказ'}`);
}

export function forwardSearch(payload: unknown, context: ActorContext): void {
    const criteria = (payload as { criteria?: unknown } | undefined)?.criteria;
    context.send(catalog.HUMAN_CATALOG_AGENT_ID, createMessage(catalog.CATALOG_SEARCH, { criteria, replyTo: context.id }));
}

export function onSearchResult(payload: unknown, context: ActorContext): void {
    const result = payload as catalog.CatalogResult | undefined;
    const names = (result?.matches ?? []).map((human) => `${human.name} (${human.profession})`);
    context.log(names.length === 0 ? 'никого не нашёл' : `нашёл: ${names.join(', ')}`);
}
