
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');

const xmlSnippet = `
<sanctionEntity designationDate="2022-02-25" designationDetails="" unitedNationId="" logicalId="135909">
        <regulation regulationType="amendment" organisationType="council" publicationDate="2022-02-25" entryIntoForceDate="2022-02-25" numberTitle="2022/332 (OJ L53)" programme="UKR" logicalId="149145">
            <publicationUrl>https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=uriserv%3AOJ.L_.2022.053.01.0001.01.ENG&amp;toc=OJ%3AL%3A2022%3A053%3ATOC</publicationUrl>
        </regulation>
        <subjectType code="person" classificationCode="P"/>
        <nameAlias firstName="" middleName="" lastName="" wholeName="Vladimir Vladimirovitj PUTIN" function="" gender="M" title="" nameLanguage="SV" strong="true" regulationLanguage="en" logicalId="136017">
            <regulationSummary regulationType="amendment" publicationDate="2022-02-25" numberTitle="2022/332 (OJ L53)" publicationUrl="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=uriserv%3AOJ.L_.2022.053.01.0001.01.ENG&amp;toc=OJ%3AL%3A2022%3A053%3ATOC"/>
        </nameAlias>
        <nameAlias firstName="" middleName="" lastName="" wholeName="Vladimir Vladimirovich PUTIN" function="President of the Russian Federation" gender="M" title="" nameLanguage="" strong="true" regulationLanguage="en" logicalId="135912">
            <regulationSummary regulationType="amendment" publicationDate="2022-02-25" numberTitle="2022/332 (OJ L53)" publicationUrl="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=uriserv%3AOJ.L_.2022.053.01.0001.01.ENG&amp;toc=OJ%3AL%3A2022%3A053%3ATOC"/>
        </nameAlias>
        <birthdate circa="false" calendarType="GREGORIAN" city="Leningrad (now Saint-Petersburg)" zipCode="" birthdate="1952-10-07" dayOfMonth="7" monthOfYear="10" year="1952" region="" place="" countryIso2Code="RU" countryDescription="RUSSIAN FEDERATION" regulationLanguage="en" logicalId="135910">
            <remark>Leningrad (now Saint-Petersburg), ex USSR (now Russian Federation)</remark>
            <regulationSummary regulationType="amendment" publicationDate="2022-02-25" numberTitle="2022/332 (OJ L53)" publicationUrl="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=uriserv%3AOJ.L_.2022.053.01.0001.01.ENG&amp;toc=OJ%3AL%3A2022%3A053%3ATOC"/>
        </birthdate>
    </sanctionEntity>
`;

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

const jsonObj = parser.parse(xmlSnippet);
const entity = jsonObj.sanctionEntity;

const output = [];
const log = (...args) => output.push(args.join(' '));

log("Parsed Entity Keys:", Object.keys(entity));

const asArray = (item) => {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
};

const nameAliases = asArray(entity.nameAlias);
log("Aliases Found:", nameAliases.length);

const rootRegs = asArray(entity.regulation);
const summaryRegs = asArray(entity.regulationSummary);

log("Root Regs Found:", rootRegs.length);
log("Summary Regs Found (Wrong location):", summaryRegs.length);

const correctSummaryRegs = nameAliases.flatMap(n => asArray(n.regulationSummary));
log("Correct Summary Regs Found:", correctSummaryRegs.length);

const birthRegs = asArray(entity.birthdate).flatMap(b => asArray(b.regulationSummary));
log("Birth Regs Found:", birthRegs.length);

if (rootRegs.length > 0) {
    const r = rootRegs[0];
    log("Root Reg URL:", r.publicationUrl || r['@_publicationUrl']);
}

fs.writeFileSync('debug_out.txt', output.join('\n'));
console.log('Done writing debug_out.txt');
