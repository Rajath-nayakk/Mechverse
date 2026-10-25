#include "ElectricalSystems/ElectricalComponentBase.h"

UElectricalComponentBase::UElectricalComponentBase()
	: ComponentIdentifier(TEXT("ELEC_COMP"))
	, ComponentType(EElectricalComponentType::Wire)
	, NodeA(TEXT("GND"))
	, NodeB(TEXT("GND"))
	, NominalResistance(0.005f)
	, FaultResistance(10.0f)
	, bIsFaulty(false)
	, bIsOpenCircuit(false)
	, CalculatedCurrentAmps(0.0f)
	, CalculatedVoltageDrop(0.0f)
{
	PrimaryComponentTick.bCanEverTick = false;
}

float UElectricalComponentBase::GetEffectiveResistance() const
{
	if (bIsOpenCircuit)
	{
		return 1e9f; // Open circuit
	}
	if (bIsFaulty)
	{
		return FaultResistance;
	}
	return NominalResistance;
}

void UElectricalComponentBase::InjectFault()
{
	bIsFaulty = true;
}

void UElectricalComponentBase::RepairFault()
{
	bIsFaulty = false;
	bIsOpenCircuit = false;
}
