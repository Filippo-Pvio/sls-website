// Shared validation for the website and its server transport.
const clean=(value,max)=>typeof value==='string'&&value.trim().length<=max&&!/[\u0000-\u001f\u007f]/u.test(value)?value.trim():'';
const normalize=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase('de-DE').replace(/\s+/gu,' ');
const validId=value=>Number.isSafeInteger(value)&&value>0;

export function parseOwnerAddress(body) {
  if(body.ownerInterest!==true)return null;
  const address={street:clean(body.ownerStreet,120),houseNumber:clean(body.ownerHouseNumber,20),zip:clean(body.ownerZip,5),city:clean(body.ownerCity,100),type:body.ownerType,unit:clean(body.ownerUnit,100),country:'DEU'};
  if(!address.street||!address.houseNumber||!/\d/u.test(address.houseNumber)||!/^\d{5}$/.test(address.zip)||!address.city||!['HOUSE','APARTMENT','TRADE_SITE'].includes(address.type)||address.type==='APARTMENT'&&!address.unit)
    throw new Error('Bitte ergänzen Sie die vollständige Adresse und die Objektart Ihrer eigenen Immobilie. Bei Wohnungen ist auch die Lage im Haus erforderlich.');
  if(address.type!=='APARTMENT')address.unit='';
  return address;
}

export const addressKey=address=>JSON.stringify([address.country,address.zip,address.city,address.street,address.houseNumber,address.type,address.unit].map(normalize));
export const buildingKey=address=>JSON.stringify([address.country,address.zip,address.city,address.street,address.houseNumber].map(normalize));

