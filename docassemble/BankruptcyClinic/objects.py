from docassemble.base.util import DAObject, Individual

class Debtor(Individual):
  aliases = []
  def init(self, *pargs, **kwargs):
    self.initializeAttribute('tax_id', DebtorTaxId)
    self.initializeAttribute('district_info', DebtorDistrictInfo)
    super().init(*pargs, **kwargs)

class DebtorAlias(Individual):
  business = None
  
class DebtorTaxId(DAObject):
  def init(self, *pargs, **kwargs):
    super().init(*pargs, **kwargs)
  
class DebtorDistrictInfo(DAObject):
  def init(self, *pargs, **kwargs):
    super().init(*pargs, **kwargs)