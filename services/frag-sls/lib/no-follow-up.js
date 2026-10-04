function isFollowUp(text){
 return /[?？]|(?:teilen|nennen|sagen|schreiben|verraten|beschreiben|geben)\s+Sie\s+(?:mir|uns)|(?:können|könnten|würden|möchten)\s+Sie\s+(?:mir|uns)|(?:darf|dürfte)\s+ich\s+fragen|ich\s+(?:benötige|brauche)\s+(?:noch\s+)?(?:weitere|mehr|Ihre)\s+(?:Angaben|Informationen)|bitte\s+(?:antworten|beantworten|konkretisieren)|lassen\s+Sie\s+(?:mich|uns)\s+wissen/i.test(text);
}
module.exports={isFollowUp};
